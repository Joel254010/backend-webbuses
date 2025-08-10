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
  obterAnuncioMeta,           // ✅ novo
  obterFotoAnuncioPorIndice,  // ✅ novo
} from '../controllers/anuncioController.js';

const router = express.Router();

// Listagem
router.get('/', listarAnuncios);
router.get('/admin', listarTodosAnunciosAdmin);

// ✅ Endpoints leves (devem vir antes do '/:id')
router.get('/:id/meta', obterAnuncioMeta);
router.get('/:id/capa', obterCapaAnuncio);
router.get('/:id/foto/:idx', obterFotoAnuncioPorIndice);

// Detalhe completo (legado)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ mensagem: 'ID inválido' });
    }
    const anuncio = await Anuncio.findById(id)
      .lean({ getters: true })
      .maxTimeMS(15000);

    if (!anuncio) return res.status(404).json({ mensagem: 'Anúncio não encontrado' });
    res.json(anuncio);
  } catch (erro) {
    res.status(500).json({ mensagem: 'Erro ao buscar anúncio por ID', detalhes: erro.message });
  }
});

// CRUD
router.post('/', criarAnuncio);
router.patch('/:id/status', atualizarStatusAnuncio);
router.patch('/:id', atualizarAnuncio);
router.delete('/:id', excluirAnuncio);

export default router;
