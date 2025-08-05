// controllers/anuncioController.js
import Anuncio from '../models/Anuncio.js';

// Criar novo anúncio
export const criarAnuncio = async (req, res) => {
  try {
    const novo = new Anuncio(req.body);
    const salvo = await novo.save();
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

    // Filtro otimizado (usa índice sem regex)
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
        imagens: { $slice: 1 }, // apenas capa
        dataCriacao: 1
      }
    )
      .sort({ dataCriacao: -1 }) // usa índice
      .skip(skip)
      .limit(limit)
      .lean();

    // Remove base64 pesado da listagem
    lista.forEach(anuncio => {
      if (anuncio.imagens && anuncio.imagens.length > 0) {
        if (typeof anuncio.imagens[0] === "string" && anuncio.imagens[0].startsWith("data:image")) {
          anuncio.imagens = [];
        }
      }
    });

    res.json({
      anuncios: lista,
      paginaAtual: page,
      totalPaginas: Math.ceil(total / limit),
      totalAnuncios: total
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
    if (!removido) return res.status(404).json({ erro: "Anúncio não encontrado." });
    res.json({ mensagem: "Anúncio excluído com sucesso" });
  } catch (erro) {
    res.status(500).json({ erro: "Erro ao excluir anúncio", detalhes: erro.message });
  }
};
