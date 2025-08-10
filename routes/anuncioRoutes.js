import express from 'express';
import mongoose from 'mongoose';
import Anuncio from '../models/Anuncio.js';
import {
  criarAnuncio,
  listarAnuncios,
  listarTodosAnunciosAdmin,
  atualizarStatusAnuncio,
  atualizarAnuncio,
  excluirAnuncio,
  obterCapaAnuncio,
} from '../controllers/anuncioController.js';

const router = express.Router();

router.get('/', listarAnuncios);
router.get('/admin', listarTodosAnunciosAdmin);

// ✅ capa antes do :id
router.get('/:id/capa', obterCapaAnuncio);

// Detalhe por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ mensagem: 'ID inválido' });
    }
    const anuncio = await Anuncio.findById(id)
      .lean({ getters: true })        // use como preferir; se precisar de virtuais, tirar o lean
      .maxTimeMS(15000);
    if (!anuncio) return res.status(404).json({ mensagem: 'Anúncio não encontrado' });
    res.json(anuncio);
  } catch (erro) {
    res.status(500).json({ mensagem: 'Erro ao buscar anúncio por ID', detalhes: erro.message });
  }
});

router.post('/', criarAnuncio);
router.patch('/:id/status', atualizarStatusAnuncio);
router.patch('/:id', atualizarAnuncio);
router.delete('/:id', excluirAnuncio);

export default router;
