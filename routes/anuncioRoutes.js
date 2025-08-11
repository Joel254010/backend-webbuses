import express from "express";
import {
  criarAnuncio,
  listarAnuncios,
  buscarAnuncioPorId,
  atualizarStatusAnuncio,
  excluirAnuncio
} from "../controllers/anuncioController.js";

const router = express.Router();

router.post("/", criarAnuncio);
router.get("/", listarAnuncios);
router.get("/:id", buscarAnuncioPorId);
router.put("/:id/status", atualizarStatusAnuncio);
router.delete("/:id", excluirAnuncio);

export default router;
