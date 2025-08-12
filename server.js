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
import Anuncio from './models/Anuncio.js'; // <- usamos no alias /admin

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
const rawAllow = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const allowList = rawAllow.map(o => o.replace(/\/$/, '')); // normaliza sem barra final
const useWildcard = allowList.length === 0;

// Quando sem allowlist, libera geral (sem credenciais) -> Access-Control-Allow-Origin: *
const corsOptions = useWildcard
  ? { origin: '*', credentials: false, maxAge: 86400 }
  : {
      origin(origin, cb) {
        if (!origin) return cb(null, true); // ferramentas tipo curl/healthz
        const o = origin.replace(/\/$/, '');
        const ok = allowList.includes(o);
        if (!ok) {
          console.warn('[CORS] origin bloqueado:', origin, 'allowList:', allowList);
        }
        cb(null, ok);
      },
      credentials: true,
      maxAge: 86400,
    };

app.use(cors(corsOptions));
// Express 5: catch-all com RegExp
app.options(/.*/, cors(corsOptions));

/* ──────────────────────────────────────────────────────────
   Body parsers
────────────────────────────────────────────────────────── */
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

/* ──────────────────────────────────────────────────────────
   STATIC (compat)
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
   Rotas API
────────────────────────────────────────────────────────── */
app.use('/api/anuncios', anuncioRoutes);
app.use('/api/anunciantes', anuncianteRoutes);
app.use('/api/curtidas', curtidaRoutes);
app.use('/preview', previewRoute);

/* ──────────────────────────────────────────────────────────
   Alias ADMIN (sem /api): lista paginada e enxuta
   GET /admin?page=1&limit=24
────────────────────────────────────────────────────────── */
app.get('/admin', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '24', 10), 1), 100);
    const skip = (page - 1) * limit;

    // projeção: só o que o painel precisa
    const projection = {
      nomeAnunciante: 1,
      anunciante: 1,
      email: 1,
      telefone: 1,
      telefoneBruto: 1,
      fabricanteCarroceria: 1,
      modeloCarroceria: 1,
      tipoModelo: 1,
      valor: 1,
      status: 1,
      fotoCapaUrl: 1,
      fotoCapaThumb: 1,
      imagens: 1,              // usado pra contar
      dataEnvio: 1,
      localizacao: 1,
    };

    const data = await Anuncio.find({}, projection)
      .sort({ dataCriacao: -1 }) // mais novos primeiro
      .skip(skip)
      .limit(limit)
      .lean();

    // garante capa para o front (thumb > url)
    const normalized = data.map((a) => ({
      ...a,
      capaUrl: a.fotoCapaThumb || a.fotoCapaUrl || null,
      imagensCount: Array.isArray(a.imagens) ? a.imagens.length : 0,
    }));

    res.json({ page, limit, count: normalized.length, data: normalized });
  } catch (err) {
    console.error('Erro /admin:', err);
    res.status(500).json({ mensagem: 'Erro ao listar anúncios' });
  }
});

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
