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
      // Pega os valores crus do body
      const rawParams = new URLSearchParams(event.body);
      const endpoint = rawParams.get('_endpoint');

      // Monta o body final direto para o Olist
      const finalParams = new URLSearchParams();
      for (const [k, v] of rawParams.entries()) {
        if (k !== '_endpoint') finalParams.append(k, v);
      }

      // Log para debug
      console.log('=== ENDPOINT:', endpoint);
      console.log('=== PRODUTO XML:', finalParams.get('produto'));
      console.log('=== FULL BODY:', finalParams.toString().slice(0, 500));

      response = await fetch(`${BASE}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: finalParams.toString(),
      });
    }

    const text = await response.text();
    console.log('=== OLIST RESPONSE:', text.slice(0, 300));
    return { statusCode: 200, headers, body: text };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
