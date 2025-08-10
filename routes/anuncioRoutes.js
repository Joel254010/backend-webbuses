import express from 'express';
import Anuncio from '../models/Anuncio.js';
import {
  criarAnuncio,
  listarAnuncios,
  listarTodosAnunciosAdmin,
  atualizarStatusAnuncio,
  atualizarAnuncio,
  excluirAnuncio,
  obterCapaAnuncio,      // ✅ nova action
} from '../controllers/anuncioController.js';

const router = express.Router();

router.get('/', listarAnuncios);
router.get('/admin', listarTodosAnunciosAdmin);

// ✅ sempre antes de '/:id'
router.get('/:id/capa', obterCapaAnuncio);

// Detalhe por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const anuncio = await Anuncio.findById(id).lean({ getters: true });
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
