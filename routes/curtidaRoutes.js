// routes/curtidaRoutes.js
const express = require('express');
const router = express.Router();
const Curtida = require('../models/Curtida');

router.post('/', async (req, res) => {
  const { anuncioId, ip } = req.body;

  try {
    const curtidaExistente = await Curtida.findOne({ anuncioId, ip });

    if (curtidaExistente) {
      return res.status(409).json({ mensagem: "Este IP já curtiu este anúncio." });
    }

    const novaCurtida = new Curtida({ anuncioId, ip });
    await novaCurtida.save();

    const totalCurtidas = await Curtida.countDocuments({ anuncioId });

    return res.status(201).json({ sucesso: true, total: totalCurtidas });
  } catch (erro) {
    console.error("Erro ao registrar curtida:", erro);
    res.status(500).json({ erro: "Erro ao registrar curtida" });
  }
});

module.exports = router;
