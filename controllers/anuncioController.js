// controllers/anuncioController.js
import Anuncio from '../models/Anuncio.js';

// Variáveis de cache em memória (somente para listagem pública)
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

// Listar anúncios aprovados (Home) — com cache e apenas capa
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
        origem: "cache"
      });
    }

    // Filtro otimizado
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
        imagens: 1,
        dataCriacao: 1
      }
    )
      .sort({ dataCriacao: -1 })
      .lean();

    // Mantém apenas a primeira imagem como capa
    lista.forEach(anuncio => {
      if (Array.isArray(anuncio.imagens) && anuncio.imagens.length > 0) {
        anuncio.imagens = [anuncio.imagens[0]];
      } else {
        anuncio.imagens = [];
      }
    });

    // Atualiza cache
    cacheAnuncios = lista;
    cacheTimestamp = Date.now();

    const paginados = lista.slice(skip, skip + limit);

    res.json({
      anuncios: paginados,
      paginaAtual: page,
      totalPaginas: Math.ceil(total / limit),
      totalAnuncios: total,
      origem: "banco"
    });

  } catch (erro) {
    res.status(500).json({ erro: "Erro ao buscar anúncios", detalhes: erro.message });
  }
};

// Listar TODOS os anúncios (PainelAdmin) — sem filtro e com todas as imagens/dados
export const listarTodosAnunciosAdmin = async (req, res) => {
  try {
    const lista = await Anuncio.find({})
      .sort({ dataCriacao: -1 })
      .lean();

    res.json(lista);
  } catch (erro) {
    res.status(500).json({ erro: "Erro ao buscar todos os anúncios (admin)", detalhes: erro.message });
  }
};

// Atualizar status
export const atualizarStatusAnuncio = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const atualizado = await Anuncio.findByIdAndUpdate(id, { status }, { new: true });
    cacheAnuncios = null; // limpa cache da Home
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
