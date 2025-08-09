// routes/anuncioRoutes.js
import express from 'express';
import Anuncio from '../models/Anuncio.js';
import {
  criarAnuncio,
  listarAnuncios,
  listarTodosAnunciosAdmin,
  atualizarStatusAnuncio,
  atualizarAnuncio,
  excluirAnuncio
} from '../controllers/anuncioController.js';

const router = express.Router();

// Listagem pública (paginada)
router.get('/', listarAnuncios);

// Admin (paginada)
router.get('/admin', listarTodosAnunciosAdmin);

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

// Criar
router.post('/', criarAnuncio);

// Atualizar somente status (rota explícita evita ambiguidade)
router.patch('/:id/status', atualizarStatusAnuncio);

// Atualizar campos
router.patch('/:id', atualizarAnuncio);

// Excluir
router.delete('/:id', excluirAnuncio);

export default router;
