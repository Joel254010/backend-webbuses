// controllers/anuncioController.js

import Anuncio from '../models/Anuncio.js'; // importa o model do banco

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

// Listar todos os anúncios salvos no MongoDB
export const listarAnuncios = async (req, res) => {
  try {
    const lista = await Anuncio.find().sort({ dataCriacao: -1 });
    res.json(lista);
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
