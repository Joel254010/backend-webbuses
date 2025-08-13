// routes/anuncioRoutes.js
import express from "express";
import {
  // CRUD / listagem
  criarAnuncio,
  listarAnuncios,
  buscarAnuncioPorId,
  atualizarStatusAnuncio,
  excluirAnuncio,
  // 👇 novas (meta e imagens) — usadas pelo frontend
  buscarAnuncioMeta,
  obterCapaDoAnuncio,
  obterFotoDoAnuncio,
} from "../controllers/anuncioController.js";
import { upload } from "../middlewares/upload.js"; // ← Multer em memória

const router = express.Router();

/**
 * Esperado no multipart/form-data:
 * - campo "capa" (opcional): 1 arquivo (foto de capa)
 * - campo "imagens" (opcional): até 10 arquivos (demais fotos)
 * Se o formulário só enviar "imagens", também funciona.
 */
router.post(
  "/",
  upload.fields([
    { name: "capa", maxCount: 1 },
    { name: "imagens", maxCount: 10 },
  ]),
  criarAnuncio
);

// Listagem (leve)
router.get("/", listarAnuncios);

// ⚠️ IMPORTANTE: rotas específicas devem vir ANTES de "/:id"
router.get("/:id/meta", buscarAnuncioMeta);        // resumo leve p/ cards
router.get("/:id/capa", obterCapaDoAnuncio);       // redireciona p/ URL da capa
router.get("/:id/foto/:idx", obterFotoDoAnuncio);  // redireciona p/ URL da foto idx

// Detalhe completo
router.get("/:id", buscarAnuncioPorId);

// Status (mantido PUT por compatibilidade)
router.put("/:id/status", atualizarStatusAnuncio);

// Exclusão
router.delete("/:id", excluirAnuncio);

export default router;
