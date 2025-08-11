// routes/anuncioRoutes.js
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
  obterAnuncioMeta,
  obterFotoAnuncioPorIndice,
} from '../controllers/anuncioController.js';

const router = express.Router();

/* ──────────────────────────────────────────────────────────
   Validação única para :id (ObjectId válido)
────────────────────────────────────────────────────────── */
router.param('id', (req, res, next, id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ mensagem: 'ID inválido' });
  }
  return next();
});

/* ──────────────────────────────────────────────────────────
   Listagens
────────────────────────────────────────────────────────── */
router.get('/', listarAnuncios);
router.get('/admin', listarTodosAnunciosAdmin);

/* ──────────────────────────────────────────────────────────
   Imagens (sempre declarar ANTES de "/:id")
────────────────────────────────────────────────────────── */
router.get('/:id/capa', obterCapaAnuncio);                // capa oficial (?w ?q ?format)
router.get('/:id/foto/:idx', obterFotoAnuncioPorIndice);  // foto por índice (?w ?q ?format)

/* ──────────────────────────────────────────────────────────
   Meta leve (detalhes sem imagens) – ideal p/ página de detalhes
────────────────────────────────────────────────────────── */
router.get('/:id/meta', obterAnuncioMeta);

/* ──────────────────────────────────────────────────────────
   Detalhe completo (compatibilidade)
   ⚠️ usa lean({ virtuals: true }) para incluir virtuals (ex.: "capa")
────────────────────────────────────────────────────────── */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const anuncio = await Anuncio.findById(id)
      .lean({ virtuals: true })
      .maxTimeMS(15000);

    if (!anuncio) {
      return res.status(404).json({ mensagem: 'Anúncio não encontrado' });
    }
    return res.json(anuncio);
  } catch (erro) {
    return res.status(500).json({
      mensagem: 'Erro ao buscar anúncio por ID',
      detalhes: erro.message,
    });
  }
});

/* ──────────────────────────────────────────────────────────
   CRUD
────────────────────────────────────────────────────────── */
router.post('/', criarAnuncio);
router.patch('/:id/status', atualizarStatusAnuncio);
router.patch('/:id', atualizarAnuncio);
router.delete('/:id', excluirAnuncio);

export default router;
