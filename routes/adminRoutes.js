import express from "express";
import { listarAnuncios } from "../controllers/anuncioController.js";
const router = express.Router();
router.get("/", listarAnuncios); // suporta ?page=&limit=&status=
export default router;
