// controllers/curtidaController.js
import Curtida from '../models/Curtida.js';

export const registrarCurtida = async (req, res) => {
  try {
    const { anuncioId, ip } = req.body;

    if (!anuncioId || !ip) {
      return res.status(400).json({ erro: 'Dados incompletos: anuncioId e ip são obrigatórios.' });
    }

    // Verifica se já curtiu
    const curtidaExistente = await Curtida.findOne({ anuncioId, ip });

    if (curtidaExistente) {
      return res.status(409).json({ mensagem: 'Este IP já curtiu este anúncio.' });
    }

    // Salva nova curtida
    const novaCurtida = new Curtida({ anuncioId, ip });
    await novaCurtida.save();

    res.status(201).json({ mensagem: 'Curtida registrada com sucesso.' });
  } catch (erro) {
    console.error('Erro ao registrar curtida:', erro);
    res.status(500).json({ erro: 'Erro ao registrar curtida.' });
  }
};

export const contarCurtidas = async (req, res) => {
  try {
    const { anuncioId } = req.params;

    const total = await Curtida.countDocuments({ anuncioId });

    res.json({ total });
  } catch (erro) {
    console.error('Erro ao contar curtidas:', erro);
    res.status(500).json({ erro: 'Erro ao contar curtidas.' });
  }
};
