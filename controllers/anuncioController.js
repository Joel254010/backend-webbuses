import Anuncio from '../models/Anuncio.js';

// Variáveis de cache em memória
let cacheAnuncios = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 60 segundos

// Criar novo anúncio
export const criarAnuncio = async (req, res) => {
  try {
    const novo = new Anuncio(req.body);
    const salvo = await novo.save();

    // Limpa o cache para garantir que novos anúncios apareçam
    cacheAnuncios = null;

    res.status(201).json({ mensagem: "Anúncio salvo com sucesso!", anuncio: salvo });
  } catch (erro) {
    res.status(500).json({ erro: "Erro ao salvar o anúncio", detalhes: erro.message });
  }
};

// Listar anúncios aprovados com paginação e campos essenciais
export const listarAnuncios = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Verifica se o cache ainda é válido
    if (cacheAnuncios && (Date.now() - cacheTimestamp) < CACHE_TTL) {
      const total = cacheAnuncios.length;
      const paginados = cacheAnuncios.slice(skip, skip + limit);
      return res.json({
        anuncios: paginados,
        paginaAtual: page,
        totalPaginas: Math.ceil(total / limit),
        totalAnuncios: total,
        origem: "cache" // para debug
      });
    }

    // Filtro otimizado (usa índice)
    const filtro = { status: "aprovado" };

    const total = await Anuncio.countDocuments(filtro);

    const lista = await Anuncio.find(
      filtro,
      {
        nomeAnunciante: 1,
        fabricanteCarroceria: 1,
        modeloCarroceria: 1,
        kilometragem: 1,
        valor: 1,
        localizacao: 1,
        imagens: { $slice: 1 },
        dataCriacao: 1
      }
    )
      .sort({ dataCriacao: -1 })
      .lean();

    // Remove base64 pesado
    lista.forEach(anuncio => {
      if (anuncio.imagens?.[0]?.startsWith("data:image")) {
        anuncio.imagens = [];
      }
    });

    // Atualiza o cache
    cacheAnuncios = lista;
    cacheTimestamp = Date.now();

    const paginados = lista.slice(skip, skip + limit);

    res.json({
      anuncios: paginados,
      paginaAtual: page,
      totalPaginas: Math.ceil(total / limit),
      totalAnuncios: total,
      origem: "banco" // para debug
    });

  } catch (erro) {
    res.status(500).json({ erro: "Erro ao buscar anúncios", detalhes: erro.message });
  }
};

// Atualizar status
export const atualizarStatusAnuncio = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const atualizado = await Anuncio.findByIdAndUpdate(id, { status }, { new: true });
    cacheAnuncios = null; // limpa cache
    if (!atualizado) return res.status(404).json({ erro: "Anúncio não encontrado." });
    res.json({ mensagem: "Status atualizado com sucesso", anuncio: atualizado });
  } catch (erro) {
    res.status(500).json({ erro: "Erro ao atualizar status", detalhes: erro.message });
  }
};

// Excluir
export const excluirAnuncio = async (req, res) => {
  const { id } = req.params;

  try {
    const removido = await Anuncio.findByIdAndDelete(id);
    cacheAnuncios = null; // limpa cache
    if (!removido) return res.status(404).json({ erro: "Anúncio não encontrado." });
    res.json({ mensagem: "Anúncio excluído com sucesso" });
  } catch (erro) {
    res.status(500).json({ erro: "Erro ao excluir anúncio", detalhes: erro.message });
  }
};
