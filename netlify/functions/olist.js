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
    let response;

    if (event.httpMethod === 'GET') {
      const params = { ...event.queryStringParameters };
      const endpoint = params._endpoint;
      delete params._endpoint;
      const qs = new URLSearchParams(params).toString();
      response = await fetch(`${BASE}/${endpoint}?${qs}`);
    } else {
      // Decodifica o body antes de processar
      const decoded = decodeURIComponent(event.body.replace(/\+/g, ' '));
      const params = new URLSearchParams(decoded);
      const endpoint = params.get('_endpoint');
      params.delete('_endpoint');

      // Monta novo body com os valores já decodificados
      const finalBody = new URLSearchParams();
      for (const [k, v] of params.entries()) {
        finalBody.append(k, v);
      }

      response = await fetch(`${BASE}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: finalBody.toString(),
      });
    }

    const text = await response.text();
    return { statusCode: 200, headers, body: text };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
