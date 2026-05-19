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

    // Tenta 3 estruturas XML diferentes em sequência
    const xmlVariants = [
      // Variante 1: anexos simples (documentação oficial)
      `<?xml version="1.0" encoding="UTF-8"?><produtos><produto><id>${produto.id}</id><anexos>${produto.urls.map(u=>`<anexo>${u}</anexo>`).join('')}</anexos></produto></produtos>`,
      // Variante 2: imagens_externas
      `<?xml version="1.0" encoding="UTF-8"?><produtos><produto><id>${produto.id}</id><imagens_externas>${produto.urls.map(u=>`<imagem_externa><url>${u}</url></imagem_externa>`).join('')}</imagens_externas></produto></produtos>`,
      // Variante 3: sem xml declaration, só produto singular
      `<produto><id>${produto.id}</id><anexos>${produto.urls.map(u=>`<anexo>${u}</anexo>`).join('')}</anexos></produto>`,
    ];

    const results = [];
    for (const xml of xmlVariants) {
      const body = new URLSearchParams({ token, formato: 'json', produto: xml });
      const response = await fetch(`${BASE}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      const text = await response.text();
      results.push({ xml: xml.slice(0, 80), response: text });
      
      // Se funcionou, retorna imediatamente
      try {
        const parsed = JSON.parse(text);
        if (parsed.retorno?.status === 'OK') {
          return { statusCode: 200, headers, body: text };
        }
      } catch {}
    }

    // Retorna todos os resultados para debug
    return { 
      statusCode: 200, 
      headers, 
      body: JSON.stringify({ debug: results }) 
    };

  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
