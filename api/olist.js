export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const BASE = 'https://api.tiny.com.br/api2';

    if (req.method === 'GET') {
      const params = { ...req.query };
      const endpoint = params._endpoint;
      delete params._endpoint;
      const qs = new URLSearchParams(params).toString();
      const r = await fetch(`${BASE}/${endpoint}?${qs}`);
      const text = await r.text();
      return res.status(200).send(text);
    }

    const { endpoint, token, produto } = req.body;
    const id = produto.id;

    // Busca produto completo — 1 chamada
    const getR = await fetch(`${BASE}/produto.obter.php?token=${encodeURIComponent(token)}&formato=JSON&id=${id}`);
    const prod = (await getR.json()).retorno.produto;
    const existentes = Array.isArray(prod.anexos) ? prod.anexos : [];

    // Adiciona TODAS as fotos de uma vez — evita múltiplas chamadas
    const novos = Array.isArray(produto.base64list)
      ? produto.base64list.map(b => ({ anexo: b }))
      : produto.base64
        ? [{ anexo: produto.base64 }]
        : (produto.urls || []).map(u => ({ anexo: u }));

    // Limite de 6 imagens total (limite do Olist)
    const todosAnexos = [...existentes, ...novos].slice(0, 6);

    const produtoAtualizado = {
      sequencia: 1,
      id: prod.id,
      nome: prod.nome,
      codigo: prod.codigo || '',
      unidade: prod.unidade || 'Un',
      preco: prod.preco || '0',
      tipo: prod.tipo || 'P',
      situacao: prod.situacao || 'A',
      origem: prod.origem || '0',
      anexos: todosAnexos,
    };

    const body = new URLSearchParams({
      token,
      formato: 'JSON',
      produto: JSON.stringify({ produtos: [{ produto: produtoAtualizado }] }),
    });

    // Aguarda 1s se vier de múltiplos produtos seguidos para evitar bloqueio
    if (produto.aguardar) await new Promise(r => setTimeout(r, 1200));

    const r = await fetch(`${BASE}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const text = await r.text();
    return res.status(200).send(text);

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
