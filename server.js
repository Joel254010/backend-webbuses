// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import compression from 'compression';
import helmet from 'helmet';

import conectarMongoDB from './config/db.js';
import anuncioRoutes from './routes/anuncioRoutes.js';
import anuncianteRoutes from './routes/anuncianteRoutes.js';
import curtidaRoutes from './routes/curtidaRoutes.js';
import previewRoute from './routes/previewRoute.js'; // ✅ Open Graph

dotenv.config();
conectarMongoDB();

const app = express();

/* ───────── Config básica ───────── */
app.set('trust proxy', 1);               // Render/NGINX proxy
app.set('etag', 'strong');               // ETag forte p/ APIs
app.disable('x-powered-by');             // menos exposição

/* ───────── Middlewares globais ───────── */
// Segurança leve (sem CSP rígido p/ não quebrar /preview)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
  })
);

// Compressão Gzip/Brotli (quando suportado) — ganha bem em payload de JSON
app.use(compression());

// CORS com cache de preflight (melhora navegação SPA)
app.use(
  cors({
    origin: true,
    credentials: true,
    maxAge: 86400, // 24h de cache do OPTIONS
  })
);
app.options('*', cors());

app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

/* ───────── Rotas ───────── */
app.get('/healthz', (req, res) => res.status(200).send('ok')); // p/ Render health checks

app.use('/api/anuncios', anuncioRoutes);
app.use('/api/anunciantes', anuncianteRoutes);
app.use('/api/curtidas', curtidaRoutes);
app.use('/preview', previewRoute); // ✅ OG Image Preview

// Rota padrão
app.get('/', (req, res) => {
  res.send('🚍 Backend Web Buses rodando com sucesso!');
});

/* ───────── Inicialização ───────── */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});
