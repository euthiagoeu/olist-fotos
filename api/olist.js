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
    const urls = produto.urls;

    // Busca produto completo
    const getR = await fetch(`${BASE}/produto.obter.php?token=${encodeURIComponent(token)}&formato=JSON&id=${id}`);
    const prod = (await getR.json()).retorno.produto;

    // Imagens externas existentes
    const existentes = prod.imagens_externas
      ? (Array.isArray(prod.imagens_externas) ? prod.imagens_externas : [prod.imagens_externas])
      : [];

    // Adiciona novas URLs como imagens_externas
    const novas = urls.map(u => ({ imagem_externa: { link: u } }));
    const todasExternas = [...existentes, ...novas];

    const produtoAtualizado = {
      sequencia: 1,
      id: prod.id,
      nome: prod.nome,
      codigo: prod.codigo || '',
      unidade: prod.unidade || 'UN',
      preco: prod.preco || '0',
      tipo: prod.tipo || 'P',
      situacao: prod.situacao || 'A',
      origem: prod.origem || '0',
      imagens_externas: todasExternas,
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
