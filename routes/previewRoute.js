// routes/previewRoute.js
import express from 'express';
import Anuncio from '../models/Anuncio.js';

const router = express.Router();

// Detecta crawlers que precisam do HTML com OG tags
function isCrawler(ua = '') {
  ua = ua.toLowerCase();
  return (
    ua.includes('facebookexternalhit') ||
    ua.includes('whatsapp') ||
    ua.includes('twitterbot') ||
    ua.includes('linkedinbot') ||
    ua.includes('telegrambot') ||
    ua.includes('bot') ||
    ua.includes('crawler') ||
    ua.includes('spider')
  );
}

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // ⚡ Busca enxuta: só campos usados + 1ª imagem
    const anuncio = await Anuncio.findById(
      id,
      {
        fabricanteCarroceria: 1,
        modeloCarroceria: 1,
        localizacao: 1,
        fotoCapaUrl: 1,
        imagens: { $slice: 1 }, // só a primeira
        dataCriacao: 1,
      }
    )
      .lean({ getters: true })
      .maxTimeMS(10000);

    if (!anuncio) return res.status(404).send('Anúncio não encontrado');

    const webBase = process.env.PUBLIC_WEB_URL || 'https://webbuses.com';
    const destino = `${webBase}/onibus/${id}?from=preview`;

    const titulo = `🚍 ${anuncio.fabricanteCarroceria || ''} ${anuncio.modeloCarroceria || ''}`.trim();
    const cidade = anuncio?.localizacao?.cidade || '-';
    const estado = anuncio?.localizacao?.estado || '-';
    const descricao = `Confira este ônibus à venda em ${cidade} - ${estado}.`;
    const imagem = anuncio.fotoCapaUrl || anuncio.imagens?.[0] || `${webBase}/logo.png`;

    // Cache forte (crawlers podem reusar por 1h; clientes humanos 302)
    res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    res.set('ETag', `"${id}-${anuncio.dataCriacao ? new Date(anuncio.dataCriacao).getTime() : ''}"`);

    if (!isCrawler(req.get('user-agent') || '')) {
      // 👤 Usuário humano: redireciona rápido (sem renderizar HTML pesado)
      return res.redirect(302, destino);
    }

    // 🤖 Crawler: devolve HTML com metatags OG/Twitter
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>${titulo}</title>
  <meta name="description" content="${descricao}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${titulo}">
  <meta property="og:description" content="${descricao}">
  <meta property="og:image" content="${imagem}">
  <meta property="og:url" content="${destino}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${titulo}">
  <meta name="twitter:description" content="${descricao}">
  <meta name="twitter:image" content="${imagem}">
  <meta http-equiv="refresh" content="0; url=${destino}">
  <style>body{background:#0a0a0a;color:#fff;text-align:center;font-family:sans-serif;padding:80px 20px}</style>
</head>
<body>Redirecionando…</body>
</html>`;
    res.set('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (erro) {
    console.error('preview erro:', erro);
    return res.status(500).send('Erro ao gerar preview');
  }
});

export default router;
