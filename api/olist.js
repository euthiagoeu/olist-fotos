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

    // Se for upload de imagem base64
    if (produto.base64) {
      const id = produto.id;
      const base64 = produto.base64; // "data:image/jpeg;base64,/9j/..."

      // Busca produto completo
      const getR = await fetch(`${BASE}/produto.obter.php?token=${encodeURIComponent(token)}&formato=JSON&id=${id}`);
      const prod = (await getR.json()).retorno.produto;
      const existentes = Array.isArray(prod.anexos) ? prod.anexos : [];

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
        anexos: [...existentes, { anexo: base64 }],
      };

      const body = new URLSearchParams({
        token,
        formato: 'JSON',
        produto: JSON.stringify({ produtos: [{ produto: produtoAtualizado }] }),
      });

      const r = await fetch(`${BASE}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      const text = await r.text();
      return res.status(200).send(text);
    }

    // Fallback: fluxo normal com URLs
    const id = produto.id;
    const urls = produto.urls;
    const getR = await fetch(`${BASE}/produto.obter.php?token=${encodeURIComponent(token)}&formato=JSON&id=${id}`);
    const prod = (await getR.json()).retorno.produto;
    const existentes = Array.isArray(prod.anexos) ? prod.anexos : [];
    const novos = urls.map(u => ({ anexo: u }));

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
      anexos: [...existentes, ...novos],
    };

    const body = new URLSearchParams({
      token,
      formato: 'JSON',
      produto: JSON.stringify({ produtos: [{ produto: produtoAtualizado }] }),
    });

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
