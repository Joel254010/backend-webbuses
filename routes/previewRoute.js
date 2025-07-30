import express from 'express';
import Anuncio from '../models/Anuncio.js';
const router = express.Router();

router.get('/:id', async (req, res) => {
  try {
    const anuncio = await Anuncio.findById(req.params.id);
    if (!anuncio) return res.status(404).send("Anúncio não encontrado");

    const titulo = `🚍 ${anuncio.fabricanteCarroceria} ${anuncio.modeloCarroceria}`;
    const descricao = `Confira esse ônibus à venda em ${anuncio.localizacao?.cidade} - ${anuncio.localizacao?.estado}`;
    const imagem = anuncio.imagens?.[0] || "https://webbuses.com/logo.png";
    const destino = `https://webbuses.com/onibus/${anuncio._id}`;

    res.set('Cache-Control', 'public, max-age=3600'); // ajuda no WhatsApp
    res.send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta property="og:title" content="${titulo}" />
        <meta property="og:description" content="${descricao}" />
        <meta property="og:image" content="${imagem}" />
        <meta property="og:url" content="${destino}" />
        <meta name="twitter:card" content="summary_large_image" />
        <title>${titulo}</title>
        <style>
          body {
            background-color: #0a0a0a;
            color: white;
            text-align: center;
            font-family: sans-serif;
            padding: 80px 20px;
          }
          a {
            background: #88fe03;
            padding: 12px 24px;
            border-radius: 8px;
            color: black;
            font-weight: bold;
            text-decoration: none;
            font-size: 16px;
          }
        </style>
      </head>
      <body>
        <h1>🔍 Prévia do Anúncio</h1>
        <p>${descricao}</p>
        <img src="${imagem}" alt="Imagem do ônibus" width="90%" style="max-width:500px;border-radius:12px;" />
        <br/><br/>
        <a href="${destino}">👉 Ver anúncio completo</a>
      </body>
      </html>
    `);
  } catch (erro) {
    console.error("Erro na rota /preview:", erro);
    res.status(500).send("Erro ao gerar preview");
  }
});

export default router;
