// routes/anuncioRoutes.js

import express from 'express';
import {
  criarAnuncio,
  listarAnuncios,
  atualizarStatusAnuncio,
  excluirAnuncio
} from '../controllers/anuncioController.js';

const router = express.Router();

router.post('/', criarAnuncio);             // POST  /api/anuncios
router.get('/', listarAnuncios);            // GET   /api/anuncios
router.patch('/:id', atualizarStatusAnuncio); // PATCH /api/anuncios/:id
router.delete('/:id', excluirAnuncio);        // DELETE /api/anuncios/:id

export default router;
