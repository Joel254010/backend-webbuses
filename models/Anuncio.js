import Anuncio from '../models/Anuncio.js';

// ----------------------
// Cache simples em memória (por consulta)
// ----------------------
const CACHE_TTL = 60_000; // 60s
const cache = new Map();  // chave => { when, payload }
const k = (name, q) => `${name}:${JSON.stringify(q)}`;

// ----------------------
// Criar novo anúncio
// ----------------------
export const criarAnuncio = async (req, res) => {
  try {
    const novo = new Anuncio(req.body);

    // Gera capa se não veio
    if (!novo.fotoCapaUrl && Array.isArray(novo.imagens) && novo.imagens.length > 0) {
      novo.fotoCapaUrl = novo.imagens[0];
    }

    const salvo = await novo.save();

    // Invalida caches de listagem
    for (const key of cache.keys()) if (key.startsWith('listar:')) cache.delete(key);

    res.status(201).json({ mensagem: "Anúncio salvo com sucesso!", anuncio: salvo });
  } catch (erro) {
    res.status(500).json({ erro: "Erro ao salvar o anúncio", detalhes: erro.message });
  }
};

// ----------------------
// Listar anúncios aprovados (Home / Meus Anúncios)
// - paginação REAL no banco
// - payload leve (NÃO retorna `imagens`)
// - retorna `capaUrl` (fotoCapaUrl ou primeira imagem)
// ----------------------
export const listarAnuncios = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
    const skip = (page - 1) * limit;

    const filtro = { status: "aprovado" };
    if (req.query.anuncianteId) filtro.anunciante = req.query.anuncianteId;
    if (req.query.tipoModelo) filtro.tipoModelo = req.query.tipoModelo;

    // Cache por chave
    const cacheKey = k('listar', { page, limit, filtro });
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.when < CACHE_TTL) {
      res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
      return res.json({ ...hit.payload, origem: "cache" });
    }

    // Aggregation com projeção leve e ordenação por dataCriacao
    const pipeline = [
      { $match: filtro },
      { $sort: { dataCriacao: -1 } },
      {
        $project: {
          nomeAnunciante: 1,
          anunciante: 1,
          email: 1,
          telefone: 1,
          telefoneBruto: 1,
          tipoModelo: 1,
          fabricanteCarroceria: 1,
          modeloCarroceria: 1,
          kilometragem: 1,
          valor: 1,
          localizacao: 1,
          status: 1,
          dataCriacao: 1,
          capaUrl: { $ifNull: ["$fotoCapaUrl", { $arrayElemAt: ["$imagens", 0] }] },
          // Campos pesados fora da listagem
          imagens: 0,
          descricao: 0,
          __v: 0
        }
      },
      { $skip: skip },
      { $limit: limit }
    ];

    const [anuncios, total] = await Promise.all([
      Anuncio.aggregate(pipeline).allowDiskUse(true),
      Anuncio.countDocuments(filtro)
    ]);

    const payload = {
      anuncios,
      paginaAtual: page,
      totalPaginas: Math.ceil(total / limit) || 1,
      totalAnuncios: total,
      origem: "banco"
    };

    cache.set(cacheKey, { when: Date.now(), payload });

    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    return res.json(payload);
  } catch (erro) {
    res.status(500).json({ erro: "Erro ao buscar anúncios", detalhes: erro.message });
  }
};

// ----------------------
// Listar TODOS (Admin)
// - paginação real
// - por padrão NÃO envia `imagens` (usa imagensCount). Use ?full=1 quando precisar.
// - suporta filtros básicos
// ----------------------
export const listarTodosAnunciosAdmin = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
    const skip = (page - 1) * limit;
    const full = req.query.full === '1';

    const filtro = {};
    if (req.query.status) filtro.status = req.query.status;
    if (req.query.anuncianteId) filtro.anunciante = req.query.anuncianteId;
    if (req.query.tipoModelo) filtro.tipoModelo = req.query.tipoModelo;

    const projection = {
      nomeAnunciante: 1,
      anunciante: 1,
      email: 1,
      telefone: 1,
      telefoneBruto: 1,
      tipoModelo: 1,
      fabricanteCarroceria: 1,
      modeloCarroceria: 1,
      fabricanteChassis: 1,
      modeloChassis: 1,
      kilometragem: 1,
      lugares: 1,
      cor: 1,
      anoModelo: 1,
      valor: 1,
      descricao: full ? 1 : 0,
      fotoCapaUrl: 1,
      localizacao: 1,
      status: 1,
      dataCadastro: 1,
      dataEnvio: 1,
      dataCriacao: 1
    };

    if (full) {
      projection.imagens = 1;
    } else {
      projection.imagensCount = { $size: { $ifNull: ["$imagens", []] } };
    }

    const pipeline = [
      { $match: filtro },
      { $sort: { dataCriacao: -1 } },
      { $project: projection },
      { $skip: skip },
      { $limit: limit }
    ];

    const [items, total] = await Promise.all([
      Anuncio.aggregate(pipeline).allowDiskUse(true),
      Anuncio.countDocuments(filtro)
    ]);

    res.set("Cache-Control", "private, max-age=0, must-revalidate");
    return res.json({
      data: items,
      paginaAtual: page,
      totalPaginas: Math.ceil(total / limit) || 1,
      total
    });
  } catch (erro) {
    res.status(500).json({
      erro: "Erro ao buscar todos os anúncios (admin)",
      detalhes: erro.message
    });
  }
};

// ----------------------
// Atualizar apenas status
// ----------------------
export const atualizarStatusAnuncio = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const atualizado = await Anuncio.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true, fields: { __v: 0 } }
    ).lean();

    for (const key of cache.keys()) if (key.startsWith('listar:')) cache.delete(key);

    if (!atualizado) return res.status(404).json({ erro: "Anúncio não encontrado." });
    res.json({ mensagem: "Status atualizado com sucesso", anuncio: atualizado });
  } catch (erro) {
    res.status(500).json({ erro: "Erro ao atualizar status", detalhes: erro.message });
  }
};

// ----------------------
// Atualizar qualquer campo
// ----------------------
export const atualizarAnuncio = async (req, res) => {
  const { id } = req.params;
  const dados = req.body || {};

  try {
    if (!dados.fotoCapaUrl && Array.isArray(dados.imagens) && dados.imagens.length > 0) {
      dados.fotoCapaUrl = dados.imagens[0];
    }

    const atualizado = await Anuncio.findByIdAndUpdate(
      id,
      dados,
      { new: true, runValidators: true, fields: { __v: 0 } }
    ).lean();

    for (const key of cache.keys()) if (key.startsWith('listar:')) cache.delete(key);

    if (!atualizado) return res.status(404).json({ erro: "Anúncio não encontrado." });
    res.json({ mensagem: "Anúncio atualizado com sucesso", anuncio: atualizado });
  } catch (erro) {
    res.status(500).json({ erro: "Erro ao atualizar anúncio", detalhes: erro.message });
  }
};

// ----------------------
// Excluir
// ----------------------
export const excluirAnuncio = async (req, res) => {
  const { id } = req.params;

  try {
    const removido = await Anuncio.findByIdAndDelete(id).lean();

    for (const key of cache.keys()) if (key.startsWith('listar:')) cache.delete(key);

    if (!removido) return res.status(404).json({ erro: "Anúncio não encontrado." });
    res.json({ mensagem: "Anúncio excluído com sucesso" });
  } catch (erro) {
    res.status(500).json({ erro: "Erro ao excluir anúncio", detalhes: erro.message });
  }
};
