// routes/anuncioRoutes.js
import express from "express";
import {
  criarAnuncio,
  listarAnuncios,
  buscarAnuncioPorId,
  atualizarStatusAnuncio,
  excluirAnuncio
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
    { name: "imagens", maxCount: 10 }
  ]),
  criarAnuncio
);

router.get("/", listarAnuncios);
router.get("/:id", buscarAnuncioPorId);

// Mantive POR compatibilidade (PUT). Se preferir, depois mudamos para PATCH.
router.put("/:id/status", atualizarStatusAnuncio);
router.delete("/:id", excluirAnuncio);

export default router;
