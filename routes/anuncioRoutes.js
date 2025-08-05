// routes/anuncioRoutes.js
import express from 'express';
import {
  criarAnuncio,
  listarAnuncios,
  atualizarStatusAnuncio,
  excluirAnuncio
} from '../controllers/anuncioController.js';

const router = express.Router();

// GET - Listar anúncios com paginação
router.get('/', listarAnuncios);

// GET - Buscar por ID
router.get('/:id', async (req, res) => {
  try {
    const anuncio = await Anuncio.findById(req.params.id);
    if (!anuncio) return res.status(404).json({ mensagem: 'Anúncio não encontrado' });
    res.json(anuncio);
  } catch (erro) {
    res.status(500).json({ mensagem: 'Erro ao buscar anúncio por ID' });
  }
});

// POST
router.post('/', criarAnuncio);

// PATCH
router.patch('/:id', atualizarStatusAnuncio);

// DELETE
router.delete('/:id', excluirAnuncio);

export default router;
