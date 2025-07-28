import express from 'express';
import { cadastrarAnunciante, loginAnunciante } from '../controllers/anuncianteController.js';

const router = express.Router();

// POST /anunciantes → Cadastro
router.post('/', cadastrarAnunciante);

// ✅ POST /anunciantes/login → Login
router.post('/login', loginAnunciante);

export default router;
