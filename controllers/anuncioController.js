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

// Listar todos os anúncios salvos no MongoDB (sem imagens pesadas)
export const listarAnuncios = async (req, res) => {
  try {
    const lista = await Anuncio.find({}, { imagens: 0 }) // ← Remove campo 'imagens'
      .sort({ dataCriacao: -1 })
      .limit(50)
      .lean(); // ← Adiciona lean para performance!

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
