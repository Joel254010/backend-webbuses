// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import compression from 'compression';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import conectarMongoDB from './config/db.js';
import anuncioRoutes from './routes/anuncioRoutes.js';
import anuncianteRoutes from './routes/anuncianteRoutes.js';
import curtidaRoutes from './routes/curtidaRoutes.js';
import previewRoute from './routes/previewRoute.js';
import { listarAnuncios } from './controllers/anuncioController.js';

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
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
  })
);
app.use(compression());

/* ──────────────────────────────────────────────────────────
   CORS
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
// Express 5: use '(.*)' em vez de '*'
app.options('(.*)', cors(corsOptions));

/* ──────────────────────────────────────────────────────────
   Body parsers
────────────────────────────────────────────────────────── */
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

/* ──────────────────────────────────────────────────────────
   STATIC (mantido para compat)
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
   Logs + Rate limit
────────────────────────────────────────────────────────── */
app.use(morgan(':date[iso] :method :url -> :status :response-time ms'));

const apiLimiter = rateLimit({
  windowMs: 2 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  // não limita preflight e healthcheck
  skip: (req) => req.method === 'OPTIONS' || req.path === '/healthz',
});
app.use('/api', apiLimiter);

/* ──────────────────────────────────────────────────────────
   Healthcheck
────────────────────────────────────────────────────────── */
app.get('/healthz', (_req, res) => res.status(200).send('ok'));

/* ──────────────────────────────────────────────────────────
   Rotas
────────────────────────────────────────────────────────── */
app.use('/api/anuncios', anuncioRoutes);
app.use('/api/anunciantes', anuncianteRoutes);
app.use('/api/curtidas', curtidaRoutes);
app.use('/preview', previewRoute);

// Alias para o Painel Admin
app.get('/admin', listarAnuncios);

app.get('/', (_req, res) => {
  res.send('🚍 Backend Web Buses rodando com sucesso!');
});

/* ──────────────────────────────────────────────────────────
   404 + Error handler
────────────────────────────────────────────────────────── */
app.use((_req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada' });
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    erro: 'Erro interno do servidor',
    detalhes: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

/* ──────────────────────────────────────────────────────────
   Boot
────────────────────────────────────────────────────────── */
const PORT = process.env.PORT || 5000;

try {
  await conectarMongoDB();
  app.listen(PORT, () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
  });
} catch (err) {
  console.error('❌ Falha ao conectar no MongoDB:', err);
  process.exit(1);
}

export default app;
