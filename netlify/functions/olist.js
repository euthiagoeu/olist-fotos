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

    // POST: recebe JSON do frontend
    const { endpoint, token, produto } = JSON.parse(event.body);

    // Monta o XML do produto
    const xml = `<produto><id>${produto.id}</id><imagens>${
      produto.urls.map(u => `<imagem><link>${u}</link></imagem>`).join('')
    }</imagens></produto>`;

    // Envia para o Olist
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
