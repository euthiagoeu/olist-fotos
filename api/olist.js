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

    // 1. Busca produto completo
    const getR = await fetch(`${BASE}/produto.obter.php?token=${encodeURIComponent(token)}&formato=JSON&id=${id}`);
    const prod = (await getR.json()).retorno.produto;

    // 2. Monta imagens — retorna o campo RAW para debug
    const imagensRaw = prod.imagens || prod.anexos || prod.fotos || null;

    // 3. Testa 3 formatos de imagem diferentes
    const formatosImagem = [
      // Formato A: array de strings simples
      { imagens: urls },
      // Formato B: objeto com url
      { imagens: urls.map(u => ({ url: u })) },
      // Formato C: objeto com link dentro de imagem
      { imagens: { imagem: { link: urls[0] } } },
    ];

    const results = [];
    for (let i = 0; i < formatosImagem.length; i++) {
      const produtoAtualizado = {
        sequencia: 1,
        id: prod.id,
        nome: prod.nome,
        codigo: prod.codigo || '',
        unidade: prod.unidade || 'UN',
        preco: prod.preco || '0',
        tipo: prod.tipo || 'P',
        situacao: prod.situacao || 'A',
        origem: prod.origem || '0',
        ...formatosImagem[i],
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
      results.push({ formato: i + 1, resposta: text.slice(0, 300) });
    }

    return res.status(200).json({
      debug: results,
      imagens_raw_do_produto: imagensRaw,
      campos_disponiveis: Object.keys(prod),
    });

  } catch (e) {
    return res.status(500).json({ error: e.message, stack: e.stack });
  }
}
