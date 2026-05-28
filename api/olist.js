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

    // 1. Busca o produto completo para pegar todos os campos obrigatórios
    const getR = await fetch(`${BASE}/produto.obter.php?token=${encodeURIComponent(token)}&formato=JSON&id=${id}`);
    const getText = await getR.text();
    const getData = JSON.parse(getText);

    if (getData.retorno?.status === 'Erro') {
      return res.status(200).json({ error: 'Erro ao buscar produto', detalhe: getData });
    }

    const prod = getData.retorno.produto;

    // 2. Monta o JSON completo do produto com as novas imagens adicionadas
    const imagensExistentes = prod.imagens
      ? (Array.isArray(prod.imagens) ? prod.imagens : [prod.imagens]).map(i => i.imagem || i)
      : [];

    const novasImagens = urls.map(u => ({ imagem: { link: u } }));
    const todasImagens = [...imagensExistentes.map(i => ({ imagem: i })), ...novasImagens];

    const produtoAtualizado = {
      sequencia: 1,
      id: prod.id,
      nome: prod.nome,
      codigo: prod.codigo || '',
      unidade: prod.unidade || 'UN',
      preco: prod.preco || prod.preco_custo || '0',
      tipo: prod.tipo || 'P',
      situacao: prod.situacao || 'A',
      origem: prod.origem || '0',
      imagens: todasImagens,
    };

    // Campos opcionais — só inclui se existirem
    if (prod.descricao) produtoAtualizado.descricao = prod.descricao;
    if (prod.gtin) produtoAtualizado.gtin = prod.gtin;
    if (prod.ncm) produtoAtualizado.ncm = prod.ncm;
    if (prod.peso_bruto) produtoAtualizado.peso_bruto = prod.peso_bruto;
    if (prod.peso_liquido) produtoAtualizado.peso_liquido = prod.peso_liquido;

    const jsonProduto = JSON.stringify({ produtos: [{ produto: produtoAtualizado }] });

    const body = new URLSearchParams({ token, formato: 'JSON', produto: jsonProduto });
    const postR = await fetch(`${BASE}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const postText = await postR.text();
    return res.status(200).send(postText);

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
