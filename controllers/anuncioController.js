import Anuncio from '../models/Anuncio.js';

// ----------------------
const CACHE_TTL = 60_000; // 60s
const MAX_CACHE = 100;
const cache = new Map();
const k = (name, q) => `${name}:${JSON.stringify(q)}`;

function setCache(key, payload) {
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
  cache.set(key, { when: Date.now(), payload });
}
function invalidateListCaches() {
  for (const key of cache.keys()) if (key.startsWith('listar:')) cache.delete(key);
}

// ----------------------
export const criarAnuncio = async (req, res) => {
  try {
    const novo = new Anuncio(req.body);
    if (!novo.fotoCapaUrl && Array.isArray(novo.imagens) && novo.imagens.length > 0) {
      novo.fotoCapaUrl = novo.imagens[0];
    }
    const salvo = await novo.save();
    invalidateListCaches();
    res.status(201).json({ mensagem: "Anúncio salvo com sucesso!", anuncio: salvo });
  } catch (erro) {
    res.status(500).json({ erro: "Erro ao salvar o anúncio", detalhes: erro.message });
  }
};

// ----------------------
export const listarAnuncios = async (req, res) => {
  try {
    const page  = Math.max(parseInt(req.query.page)  || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
    const skip  = (page - 1) * limit;

    const filtro = { status: "aprovado" };
    if (req.query.anuncianteId) filtro.anunciante = req.query.anuncianteId;
    if (req.query.tipoModelo)   filtro.tipoModelo = req.query.tipoModelo;

    const cacheKey = k('listar', { page, limit, filtro });
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.when < CACHE_TTL) {
      res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
      return res.json({ ...hit.payload, origem: "cache" });
    }

    const pipeline = [
      { $match: filtro },
      { $sort: { dataCriacao: -1 } },
      {
        $project: {
          nomeAnunciante: 1,
          telefone: 1,
          telefoneBruto: 1,
          email: 1,
          tipoModelo: 1,
          fabricanteCarroceria: 1,
          modeloCarroceria: 1,
          kilometragem: 1,
          valor: 1,
          localizacao: 1,
          status: 1,
          dataCriacao: 1,

          // ⚠️ Só envia URL http/https; se for base64 → null
          capaUrl: {
            $let: {
              vars: {
                preferida: { $ifNull: ["$fotoCapaUrl", { $arrayElemAt: ["$imagens", 0] }] }
              },
              in: {
                $cond: [
                  { $regexMatch: { input: "$$preferida", regex: /^https?:\/\//i } },
                  "$$preferida",
                  null
                ]
              }
            }
          },

          // informa se existe capa armazenada sem mandar o array
          hasCapa: {
            $gt: [{ $size: { $ifNull: ["$imagens", []] } }, 0]
          }
        }
      },
      { $skip: skip },
      { $limit: limit }
    ];

    const agg = Anuncio.aggregate(pipeline).allowDiskUse(true).option({ maxTimeMS: 15000 });

    const [anuncios, total] = await Promise.all([ agg.exec(), Anuncio.countDocuments(filtro) ]);

    const payload = {
      anuncios,
      paginaAtual: page,
      totalPaginas: Math.ceil(total / limit) || 1,
      totalAnuncios: total,
      origem: "banco"
    };

    setCache(cacheKey, payload);
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    return res.json(payload);
  } catch (erro) {
    res.status(500).json({ erro: "Erro ao buscar anúncios", detalhes: erro.message });
  }
};

// ----------------------
export const listarTodosAnunciosAdmin = async (req, res) => {
  try {
    const page  = Math.max(parseInt(req.query.page)  || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
    const skip  = (page - 1) * limit;
    const full  = (req.query.full === '1');

    const filtro = {};
    if (req.query.status)       filtro.status = req.query.status;
    if (req.query.anuncianteId) filtro.anunciante = req.query.anuncianteId;

    const projectionBase = {
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
      fotoCapaUrl: 1,
      localizacao: 1,
      status: 1,
      dataCadastro: 1,
      dataEnvio: 1,
      dataCriacao: 1
    };

    const projectStage = full
      ? { ...projectionBase, descricao: 1, imagens: 1 }
      : { ...projectionBase, imagensCount: { $size: { $ifNull: ["$imagens", []] } } };

    const pipeline = [
      { $match: filtro },
      { $sort: { dataCriacao: -1 } },
      { $project: projectStage },
      { $skip: skip },
      { $limit: limit }
    ];

    const agg = Anuncio.aggregate(pipeline).allowDiskUse(true).option({ maxTimeMS: 15000 });

    const [items, total] = await Promise.all([ agg.exec(), Anuncio.countDocuments(filtro) ]);

    res.set("Cache-Control", "private, max-age=0, must-revalidate");
    return res.json({
      data: items,
      paginaAtual: page,
      totalPaginas: Math.ceil(total / limit) || 1,
      total
    });
  } catch (erro) {
    res.status(500).json({ erro: "Erro ao buscar todos os anúncios (admin)", detalhes: erro.message });
  }
};

// ----------------------
export const atualizarStatusAnuncio = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const atualizado = await Anuncio.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true, projection: { __v: 0 } }
    ).lean();

    invalidateListCaches();
    if (!atualizado) return res.status(404).json({ erro: "Anúncio não encontrado." });
    res.json({ mensagem: "Status atualizado com sucesso", anuncio: atualizado });
  } catch (erro) {
    res.status(500).json({ erro: "Erro ao atualizar status", detalhes: erro.message });
  }
};

// ----------------------
export const atualizarAnuncio = async (req, res) => {
  const { id } = req.params;
  const dadosAtualizados = req.body || {};

  try {
    if (!dadosAtualizados.fotoCapaUrl && Array.isArray(dadosAtualizados.imagens) && dadosAtualizados.imagens.length > 0) {
      dadosAtualizados.fotoCapaUrl = dadosAtualizados.imagens[0];
    }

    const atualizado = await Anuncio.findByIdAndUpdate(
      id,
      dadosAtualizados,
      { new: true, runValidators: true, projection: { __v: 0 } }
    ).lean();

    invalidateListCaches();
    if (!atualizado) return res.status(404).json({ erro: "Anúncio não encontrado." });
    res.json({ mensagem: "Anúncio atualizado com sucesso", anuncio: atualizado });
  } catch (erro) {
    res.status(500).json({ erro: "Erro ao atualizar anúncio", detalhes: erro.message });
  }
};

// ----------------------
export const excluirAnuncio = async (req, res) => {
  const { id } = req.params;
  try {
    const removido = await Anuncio.findByIdAndDelete(id, { projection: { __v: 0 } }).lean();
    invalidateListCaches();
    if (!removido) return res.status(404).json({ erro: "Anúncio não encontrado." });
    res.json({ mensagem: "Anúncio excluído com sucesso" });
  } catch (erro) {
    res.status(500).json({ erro: "Erro ao excluir anúncio", detalhes: erro.message });
  }
};
