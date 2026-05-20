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

    // XML correto
    const xml = `<produtos><produto><id>${id}</id><imagens>${
      urls.map(u => `<imagem><link>${u}</link></imagem>`).join('')
    }</imagens></produto></produtos>`;

    // JSON equivalente (alguns usam assim)
    const jsonProduto = JSON.stringify({
      produtos: [{ produto: { id, imagens: urls.map(u => ({ imagem: { link: u } })) } }]
    });

    const attempts = [
      // 1: XML com campo "produto"
      new URLSearchParams({ token, formato: 'JSON', produto: xml }).toString(),
      // 2: JSON com campo "produto"  
      new URLSearchParams({ token, formato: 'JSON', produto: jsonProduto }).toString(),
      // 3: XML com campo "produtos" (plural)
      new URLSearchParams({ token, formato: 'JSON', produtos: xml }).toString(),
      // 4: XML sem imagens — só id — para ver se aceita alterar
      new URLSearchParams({ token, formato: 'JSON', produto: `<produtos><produto><id>${id}</id><nome>teste</nome></produto></produtos>` }).toString(),
    ];

    const results = [];
    for (let i = 0; i < attempts.length; i++) {
      const r = await fetch(`${BASE}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: attempts[i],
      });
      const text = await r.text();
      results.push({ tentativa: i + 1, resposta: text.slice(0, 300) });
      try {
        const p = JSON.parse(text);
        if (p.retorno?.status === 'OK') return res.status(200).json({ sucesso: true, tentativa: i + 1 });
      } catch {}
    }

    return res.status(200).json({ debug: results });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
