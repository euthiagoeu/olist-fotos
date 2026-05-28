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

    // Formato JSON correto — tentativa 2 foi a única que avançou
    const variants = [
      // v1: imagens como array de objetos
      { produtos: [{ produto: { sequencia: 1, id, imagens: urls.map(u => ({ imagem: { link: u } })) } }] },
      // v2: imagens_externas
      { produtos: [{ produto: { sequencia: 1, id, imagens_externas: urls.map(u => ({ imagem_externa: { url: u } })) } }] },
      // v3: fotos como array simples
      { produtos: [{ produto: { sequencia: 1, id, fotos: urls } }] },
      // v4: url_foto direto
      { produtos: [{ produto: { sequencia: 1, id, url_foto: urls[0] } }] },
    ];

    const results = [];
    for (let i = 0; i < variants.length; i++) {
      const body = new URLSearchParams({
        token,
        formato: 'JSON',
        produto: JSON.stringify(variants[i]),
      });
      const r = await fetch(`${BASE}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      const text = await r.text();
      results.push({ variante: i + 1, resposta: text.slice(0, 400) });
      try {
        const p = JSON.parse(text);
        if (p.retorno?.status === 'OK') return res.status(200).json({ sucesso: true, variante: i + 1 });
        // Se avançou além do erro 3, já é progresso
        if (p.retorno?.status_processamento === '2') {
          results[results.length - 1].avancou = true;
        }
      } catch {}
    }

    return res.status(200).json({ debug: results });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
