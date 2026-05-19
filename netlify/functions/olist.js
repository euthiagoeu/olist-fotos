exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const BASE = 'https://api.tiny.com.br/api2';

    if (event.httpMethod === 'GET') {
      const params = { ...event.queryStringParameters };
      const endpoint = params._endpoint;
      delete params._endpoint;
      const qs = new URLSearchParams(params).toString();
      const response = await fetch(`${BASE}/${endpoint}?${qs}`);
      const text = await response.text();
      return { statusCode: 200, headers, body: text };
    }

    const { endpoint, token, produto } = JSON.parse(event.body);

    // Estrutura correta conforme documentação oficial do Tiny/Olist:
    // imagens ficam dentro de <anexos><anexo>URL</anexo></anexos>
    const xml = `<?xml version="1.0" encoding="UTF-8"?><produtos><produto><id>${produto.id}</id><anexos>${
      produto.urls.map(u => `<anexo>${u}</anexo>`).join('')
    }</anexos></produto></produtos>`;

    const body = new URLSearchParams({
      token: token,
      formato: 'json',
      produto: xml,
    });

    const response = await fetch(`${BASE}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const text = await response.text();
    return { statusCode: 200, headers, body: text };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
