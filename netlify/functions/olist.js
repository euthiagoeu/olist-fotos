export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const BASE = 'https://api.tiny.com.br/api2';

    if (req.method === 'GET') {
      const params = { ...req.query };
      const endpoint = params._endpoint;
      delete params._endpoint;
      const qs = new URLSearchParams(params).toString();
      const response = await fetch(`${BASE}/${endpoint}?${qs}`);
      const text = await response.text();
      return res.status(200).json(JSON.parse(text));
    }

    const { endpoint, token, produto } = req.body;

    // Variante 3 foi a que funcionou no Netlify
    const xml = `<produto><id>${produto.id}</id><anexos>${
      produto.urls.map(u => `<anexo>${u}</anexo>`).join('')
    }</anexos></produto>`;

    const body = new URLSearchParams({ token, formato: 'json', produto: xml });

    const response = await fetch(`${BASE}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const text = await response.text();
    return res.status(200).send(text);

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
