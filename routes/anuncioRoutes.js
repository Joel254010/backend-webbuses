// routes/anuncioRoutes.js
import express from 'express';
import {
  criarAnuncio,
  listarAnuncios,
  atualizarStatusAnuncio,
  excluirAnuncio
} from '../controllers/anuncioController.js';

const router = express.Router();

// ✅ GET - Lista anúncios usando o controller otimizado
router.get('/', listarAnuncios);

// ✅ GET - Buscar anúncio por ID
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
router.post('/', criarAnuncio);

// ✅ PATCH - Atualizar status ou dados do anúncio
router.patch('/:id', atualizarStatusAnuncio);

// ✅ DELETE - Excluir anúncio
router.delete('/:id', excluirAnuncio);

export default router;
