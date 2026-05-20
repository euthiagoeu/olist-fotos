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

    // Testa variantes com formato=JSON (maiúsculo) conforme documentação oficial
    const xmlVariants = [
      // Estrutura exata da documentação oficial
      `<produtos><produto><id>${id}</id><imagens>${urls.map(u=>`<imagem><link>${u}</link></imagem>`).join('')}</imagens></produto></produtos>`,
      // Sem tag imagem, só link direto
      `<produtos><produto><id>${id}</id><imagens>${urls.map(u=>`<link>${u}</link>`).join('')}</imagens></produto></produtos>`,
      // Campo foto
      `<produtos><produto><id>${id}</id><fotos>${urls.map(u=>`<foto>${u}</foto>`).join('')}</fotos></produto></produtos>`,
      // Singular sem wrapper
      `<produto><id>${id}</id><imagens>${urls.map(u=>`<imagem><link>${u}</link></imagem>`).join('')}</imagens></produto>`,
    ];

    const results = [];
    for (let i = 0; i < xmlVariants.length; i++) {
      // Testa com JSON maiúsculo (conforme doc oficial)
      const body = new URLSearchParams({ token, formato: 'JSON', produto: xmlVariants[i] });
      const r = await fetch(`${BASE}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      const text = await r.text();
      results.push({ variante: i + 1, resposta: text });

      try {
        const parsed = JSON.parse(text);
        if (parsed.retorno?.status === 'OK') {
          return res.status(200).json({ sucesso: true, variante: i + 1 });
        }
      } catch {}
    }

    return res.status(200).json({ debug: results });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
