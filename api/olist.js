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

    // Busca produto completo
    const getR = await fetch(`${BASE}/produto.obter.php?token=${encodeURIComponent(token)}&formato=JSON&id=${id}`);
    const prod = (await getR.json()).retorno.produto;

    const existentes = Array.isArray(prod.anexos) ? prod.anexos : [];

    // Testa 3 formatos de URL diferentes para o mesmo arquivo
    const urlOriginal = urls[0];
    // Força extensão .jpg explícita no Cloudinary
    const urlComExtensao = urlOriginal.replace('/upload/', '/upload/f_jpg/');
    // URL de teste com imagem pública conhecida
    const urlTeste = 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Image_created_with_a_mobile_phone.png/220px-Image_created_with_a_mobile_phone.png';

    const variantes = [
      [...existentes, { anexo: urlOriginal }],
      [...existentes, { anexo: urlComExtensao }],
      [...existentes, { anexo: urlTeste }],
    ];

    const results = [];
    for (let i = 0; i < variantes.length; i++) {
      const produtoAtualizado = {
        sequencia: 1,
        id: prod.id,
        nome: prod.nome,
        codigo: prod.codigo || '',
        unidade: prod.unidade || 'Un',
        preco: prod.preco || '0',
        tipo: prod.tipo || 'P',
        situacao: prod.situacao || 'A',
        origem: prod.origem || '0',
        anexos: variantes[i],
      };

      const body = new URLSearchParams({
        token,
        formato: 'JSON',
        produto: JSON.stringify({ produtos: [{ produto: produtoAtualizado }] }),
      });

      const r = await fetch(`${BASE}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      const text = await r.text();
      results.push({ v: i + 1, url: variantes[i].slice(-1)[0].anexo.slice(0, 60), r: text.slice(0, 200) });
      try {
        const p = JSON.parse(text);
        if (p.retorno?.status === 'OK') {
          return res.status(200).json({ sucesso: true, variante: i + 1 });
        }
      } catch {}
    }

    return res.status(200).json({ debug: results });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
