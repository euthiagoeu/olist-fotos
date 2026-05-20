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
    const url = produto.urls[0];

    const xmlVariants = [
      `<produto><id>${id}</id><anexos><anexo>${url}</anexo></anexos></produto>`,
      `<produto><id>${id}</id><imagens><imagem><link>${url}</link></imagem></imagens></produto>`,
      `<produtos><produto><id>${id}</id><anexos><anexo>${url}</anexo></anexos></produto></produtos>`,
      `<produtos><produto><id>${id}</id><imagens><imagem><link>${url}</link></imagem></imagens></produto></produtos>`,
    ];

    const results = [];
    for (let i = 0; i < xmlVariants.length; i++) {
      const body = new URLSearchParams({ token, formato: 'json', produto: xmlVariants[i] });
      const r = await fetch(`${BASE}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      const text = await r.text();
      results.push({ variante: i + 1, xml: xmlVariants[i], resposta: text });

      try {
        const parsed = JSON.parse(text);
        if (parsed.retorno?.status === 'OK') {
          return res.status(200).json({ sucesso: true, variante: i + 1, resposta: parsed });
        }
      } catch {}
    }

    return res.status(200).json({ debug: results });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
