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

    // POST: body vem como string url-encoded do fetch do browser
    // URLSearchParams ja decodifica os valores automaticamente
    const params = new URLSearchParams(event.body);
    const endpoint = params.get('_endpoint');
    params.delete('_endpoint');

    // Reconstrói manualmente sem double-encode
    const token = params.get('token');
    const formato = params.get('formato') || 'json';
    const produto = params.get('produto'); // ja decodificado pelo URLSearchParams

    // Envia para o Olist com encoding correto
    const body = `token=${encodeURIComponent(token)}&formato=${encodeURIComponent(formato)}&produto=${encodeURIComponent(produto)}`;

    const response = await fetch(`${BASE}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body,
    });

    const text = await response.text();
    return { statusCode: 200, headers, body: text };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
