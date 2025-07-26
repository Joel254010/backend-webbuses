// controllers/anuncianteController.js
import Anunciante from '../models/Anunciante.js';

export const cadastrarAnunciante = async (req, res) => {
  try {
    const novo = new Anunciante(req.body);
    await novo.save();

    res.status(201).json({
      mensagem: "Anunciante cadastrado com sucesso!",
      anunciante: novo
    });
  } catch (erro) {
    console.error("❌ Erro ao cadastrar anunciante:", erro);
    res.status(500).json({ mensagem: "Erro ao salvar anunciante no banco de dados." });
  }
};
