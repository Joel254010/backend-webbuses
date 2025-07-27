// routes/anuncioRoutes.js
import express from 'express';
import Anuncio from '../models/Anuncio.js';

const router = express.Router();

// ✅ GET todos os anúncios
router.get('/', async (req, res) => {
  try {
    const anuncios = await Anuncio.find();
    res.json(anuncios);
  } catch (erro) {
    console.error("Erro ao buscar anúncios:", erro);
    res.status(500).json({ mensagem: 'Erro ao buscar anúncios' });
  }
});

// ✅ GET anúncio por ID
router.get('/:id', async (req, res) => {
  try {
    const anuncio = await Anuncio.findById(req.params.id);
    if (!anuncio) {
      return res.status(404).json({ mensagem: 'Anúncio não encontrado' });
    }
    res.json(anuncio);
  } catch (erro) {
    console.error("Erro ao buscar anúncio por ID:", erro);
    res.status(500).json({ mensagem: 'Erro ao buscar anúncio por ID' });
  }
});

// ✅ POST - Criar novo anúncio
router.post('/', async (req, res) => {
  try {
    const novoAnuncio = new Anuncio(req.body);
    await novoAnuncio.save();
    res.status(201).json(novoAnuncio);
  } catch (erro) {
    console.error("Erro ao criar anúncio:", erro);
    res.status(500).json({ mensagem: 'Erro ao criar anúncio' });
  }
});

// ✅ PATCH - Atualizar anúncio por ID
router.patch('/:id', async (req, res) => {
  try {
    const anuncioAtualizado = await Anuncio.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!anuncioAtualizado) {
      return res.status(404).json({ mensagem: 'Anúncio não encontrado' });
    }
    res.json(anuncioAtualizado);
  } catch (erro) {
    console.error("Erro ao atualizar anúncio:", erro);
    res.status(500).json({ mensagem: 'Erro ao atualizar anúncio' });
  }
});

// ✅ DELETE - Excluir anúncio por ID
router.delete('/:id', async (req, res) => {
  try {
    const anuncioRemovido = await Anuncio.findByIdAndDelete(req.params.id);
    if (!anuncioRemovido) {
      return res.status(404).json({ mensagem: 'Anúncio não encontrado' });
    }
    res.json({ mensagem: 'Anúncio excluído com sucesso' });
  } catch (erro) {
    console.error("Erro ao excluir anúncio:", erro);
    res.status(500).json({ mensagem: 'Erro ao excluir anúncio' });
  }
});

export default router;
