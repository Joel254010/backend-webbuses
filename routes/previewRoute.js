import express from 'express';
import Anuncio from '../models/Anuncio.js'; // ajuste o caminho se necessário

const router = express.Router();

router.get('/:id', async (req, res) => {
  try {
    const anuncio = await Anuncio.findById(req.params.id);

    if (!anuncio) return res.status(404).send("Anúncio não encontrado");

    const titulo = `🚍 ${anuncio.fabricanteCarroceria} ${anuncio.modeloCarroceria}`;
    const descricao = `Confira esse ônibus à venda em ${anuncio.localizacao?.cidade} - ${anuncio.localizacao?.estado}`;
    const imagem = anuncio.imagens?.[0] || "https://webbuses.com/logo.png";
    const destino = `https://webbuses.com/onibus/${anuncio._id}`;

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
        <meta http-equiv="refresh" content="0; URL='${destino}'" />
        <title>${titulo}</title>
      </head>
      <body>
        Redirecionando para o anúncio...
      </body>
      </html>
    `);
  } catch (erro) {
    console.error("Erro na rota /preview:", erro);
    res.status(500).send("Erro ao gerar preview");
  }
});

export default router;
