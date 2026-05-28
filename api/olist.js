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
    const url = urls[0];

    // Busca produto completo
    const getR = await fetch(`${BASE}/produto.obter.php?token=${encodeURIComponent(token)}&formato=JSON&id=${id}`);
    const prod = (await getR.json()).retorno.produto;

    const base = {
      sequencia: 1,
      id: prod.id,
      nome: prod.nome,
      codigo: prod.codigo || '',
      unidade: prod.unidade || 'UN',
      preco: prod.preco || '0',
      tipo: prod.tipo || 'P',
      situacao: prod.situacao || 'A',
      origem: prod.origem || '0',
    };

    // Testar variações do campo imagens_externas
    const variantes = [
      { ...base, imagens_externas: [{ link: url }] },
      { ...base, imagens_externas: [{ url: url }] },
      { ...base, imagens_externas: { imagem_externa: { link: url } } },
      { ...base, imagens_externas: { imagem_externa: url } },
      { ...base, imagens_externas: [url] },
    ];

    const results = [];
    for (let i = 0; i < variantes.length; i++) {
      const body = new URLSearchParams({
        token,
        formato: 'JSON',
        produto: JSON.stringify({ produtos: [{ produto: variantes[i] }] }),
      });
      const r = await fetch(`${BASE}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      const text = await r.text();
      results.push({ v: i + 1, r: text.slice(0, 200) });
      try {
        const p = JSON.parse(text);
        if (p.retorno?.status === 'OK') {
          return res.status(200).json({ sucesso: true, variante: i + 1 });
        }
      } catch {}
    }

    return res.status(200).json({ debug: results });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
