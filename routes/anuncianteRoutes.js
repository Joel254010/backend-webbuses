// routes/anuncianteRoutes.js
import express from 'express';
import { cadastrarAnunciante } from '../controllers/anuncianteController.js';

const router = express.Router();

router.post('/', cadastrarAnunciante);

export default router;
