// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import compression from 'compression';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';

import conectarMongoDB from './config/db.js';
import anuncioRoutes from './routes/anuncioRoutes.js';
import anuncianteRoutes from './routes/anuncianteRoutes.js';
import curtidaRoutes from './routes/curtidaRoutes.js';
import previewRoute from './routes/previewRoute.js';

dotenv.config();

const app = express();

/* ──────────────────────────────────────────────────────────
   Hardening + Performance
────────────────────────────────────────────────────────── */
app.set('trust proxy', 1);
app.set('etag', 'strong');
app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: false,        // API JSON
    crossOriginResourcePolicy: false,    // imagens base64/data-uri
  })
);
app.use(compression());

/* ──────────────────────────────────────────────────────────
   CORS (origens configuráveis por env)
   Ex.: CORS_ORIGINS=https://webbuses.com,https://clickcardbusiness.netlify.app
────────────────────────────────────────────────────────── */
const allowList = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin: allowList.length ? allowList : true,
  credentials: true,
  maxAge: 86400,
};

app.use(cors(corsOptions));

/* ──────────────────────────────────────────────────────────
   Body parsers (limite aumentado p/ fotos grandes)
────────────────────────────────────────────────────────── */
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

/* ──────────────────────────────────────────────────────────
   STATIC: /uploads (se fotos forem salvas fisicamente)
────────────────────────────────────────────────────────── */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'), {
    maxAge: '7d',
    etag: true,
    fallthrough: true,
  })
);

/* ──────────────────────────────────────────────────────────
   Logger simples (útil no Render p/ medir latência real)
────────────────────────────────────────────────────────── */
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
  });
  next();
});

/* ──────────────────────────────────────────────────────────
   Healthcheck
────────────────────────────────────────────────────────── */
app.get('/healthz', (req, res) => res.status(200).send('ok'));

/* ──────────────────────────────────────────────────────────
   Rotas
────────────────────────────────────────────────────────── */
app.use('/api/anuncios', anuncioRoutes);
app.use('/api/anunciantes', anuncianteRoutes);
app.use('/api/curtidas', curtidaRoutes);
app.use('/preview', previewRoute);

app.get('/', (req, res) => {
  res.send('🚍 Backend Web Buses rodando com sucesso!');
});

/* ──────────────────────────────────────────────────────────
   404 + Error handler (JSON)
────────────────────────────────────────────────────────── */
app.use((req, res, next) => {
  res.status(404).json({ erro: 'Rota não encontrada' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  const payload = {
    erro: 'Erro interno do servidor',
    detalhes: process.env.NODE_ENV === 'development' ? err.message : undefined,
  };
  res.status(500).json(payload);
});

/* ──────────────────────────────────────────────────────────
   Boot
────────────────────────────────────────────────────────── */
const PORT = process.env.PORT || 5000;

try {
  await conectarMongoDB(); // Node 20+ suporta top-level await
  app.listen(PORT, () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
  });
} catch (err) {
  console.error('❌ Falha ao conectar no MongoDB:', err);
  process.exit(1);
}

export default app;
