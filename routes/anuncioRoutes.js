// routes/anuncioRoutes.js
import express from 'express';
import Anuncio from '../models/Anuncio.js';
import {
  criarAnuncio,
  listarAnuncios,
  listarTodosAnunciosAdmin, // ✅ nova função para admin
  atualizarStatusAnuncio,
  excluirAnuncio
} from '../controllers/anuncioController.js';

const router = express.Router();

// ✅ GET - Listar anúncios aprovados com paginação (Home)
router.get('/', listarAnuncios);

// ✅ GET - Listar TODOS os anúncios (PainelAdmin)
router.get('/admin', listarTodosAnunciosAdmin);

// ✅ GET - Buscar anúncio completo por ID (Página de detalhes)
router.get('/:id', async (req, res) => {
  try {
    const anuncio = await Anuncio.findById(req.params.id).lean();
    if (!anuncio) {
      return res.status(404).json({ mensagem: 'Anúncio não encontrado' });
    }
    res.json(anuncio);
  } catch (erro) {
    res.status(500).json({ mensagem: 'Erro ao buscar anúncio por ID', detalhes: erro.message });
  }
});

// ✅ POST - Criar novo anúncio
router.post('/', criarAnuncio);

// ✅ PATCH - Atualizar status
router.patch('/:id', atualizarStatusAnuncio);

// ✅ DELETE - Excluir anúncio
router.delete('/:id', excluirAnuncio);

export default router;
