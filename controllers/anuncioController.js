// controllers/anuncioController.js
import Anuncio from '../models/Anuncio.js';

// Criar um novo anúncio no MongoDB
export const criarAnuncio = async (req, res) => {
  try {
    const novo = new Anuncio(req.body);
    const salvo = await novo.save();
    res.status(201).json({ mensagem: "Anúncio salvo com sucesso!", anuncio: salvo });
  } catch (erro) {
    res.status(500).json({ erro: "Erro ao salvar o anúncio", detalhes: erro.message });
  }
};

// Listar anúncios aprovados com paginação e apenas dados essenciais
export const listarAnuncios = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Página atual (default 1)
    const limit = parseInt(req.query.limit) || 20; // Itens por página (default 20)
    const skip = (page - 1) * limit;

    // Conta total de anúncios aprovados
    const total = await Anuncio.countDocuments({ status: "aprovado" });

    // Busca anúncios com apenas os campos necessários
    const lista = await Anuncio.find(
      { status: "aprovado" },
      {
        nomeAnunciante: 1,
        fabricanteCarroceria: 1,
        modeloCarroceria: 1,
        kilometragem: 1,
        valor: 1,
        localizacao: 1,
        imagens: { $slice: 1 }, // Apenas a primeira imagem (capa)
      }
    )
      .sort({ dataCriacao: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

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

// Atualizar status (aprovado/rejeitado)
export const atualizarStatusAnuncio = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const atualizado = await Anuncio.findByIdAndUpdate(id, { status }, { new: true });

    if (!atualizado) {
      return res.status(404).json({ erro: "Anúncio não encontrado." });
    }

    res.json({ mensagem: "Status atualizado com sucesso", anuncio: atualizado });
  } catch (erro) {
    res.status(500).json({ erro: "Erro ao atualizar status", detalhes: erro.message });
  }
};

// Excluir anúncio por ID
export const excluirAnuncio = async (req, res) => {
  const { id } = req.params;

  try {
    const removido = await Anuncio.findByIdAndDelete(id);

    if (!removido) {
      return res.status(404).json({ erro: "Anúncio não encontrado." });
    }

    res.json({ mensagem: "Anúncio excluído com sucesso" });
  } catch (erro) {
    res.status(500).json({ erro: "Erro ao excluir anúncio", detalhes: erro.message });
  }
};
