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

    const xml = `<produtos><produto><id>${id}</id><imagens><imagem><link>${url}</link></imagem></imagens></produto></produtos>`;

    // Testa 4 formas diferentes de enviar o POST
    const attempts = [
      // 1: URLSearchParams normal
      () => {
        const b = new URLSearchParams({ token, formato: 'JSON', produto: xml });
        return fetch(`${BASE}/${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: b.toString(),
        });
      },
      // 2: Query string na URL, sem body
      () => fetch(`${BASE}/${endpoint}?token=${encodeURIComponent(token)}&formato=JSON&produto=${encodeURIComponent(xml)}`, {
        method: 'POST',
      }),
      // 3: GET em vez de POST
      () => fetch(`${BASE}/${endpoint}?token=${encodeURIComponent(token)}&formato=JSON&produto=${encodeURIComponent(xml)}`),
      // 4: POST sem produto — só para ver se token é válido
      () => {
        const b = new URLSearchParams({ token, formato: 'JSON' });
        return fetch(`${BASE}/${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: b.toString(),
        });
      },
    ];

    const results = [];
    for (let i = 0; i < attempts.length; i++) {
      try {
        const r = await attempts[i]();
        const text = await r.text();
        results.push({ tentativa: i + 1, status: r.status, resposta: text.slice(0, 200) });
        const parsed = JSON.parse(text);
        if (parsed.retorno?.status === 'OK') {
          return res.status(200).json({ sucesso: true, tentativa: i + 1 });
        }
      } catch(e) {
        results.push({ tentativa: i + 1, erro: e.message });
      }
    }

    return res.status(200).json({ debug: results, xml_usado: xml });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
