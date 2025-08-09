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
app.set('trust proxy', 1);
app.set('etag', 'strong');
app.disable('x-powered-by');

/* ───────── Middlewares globais ───────── */
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
  })
);
app.use(compression());
app.use(
  cors({
    origin: true,
    credentials: true,
    maxAge: 86400,
  })
);
app.options('*', cors());

app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

/* ───────── Healthcheck ───────── */
app.get('/healthz', (req, res) => res.status(200).send('ok'));

/* ───────── Registro de rotas com proteção ───────── */
const safeUse = (basePath, router) => {
  try {
    if (typeof basePath !== 'string') throw new TypeError(`basePath inválido: ${String(basePath)}`);
    app.use(basePath, router);
  } catch (e) {
    console.error(`❌ Falha ao registrar rota base "${basePath}"`);
    console.error(e && e.stack ? e.stack : e);
    // Encerra para o Render mostrar o stack certo
    process.exit(1);
  }
};

safeUse('/api/anuncios', anuncioRoutes);
safeUse('/api/anunciantes', anuncianteRoutes);
safeUse('/api/curtidas', curtidaRoutes);
safeUse('/preview', previewRoute);

// Rota padrão
app.get('/', (req, res) => {
  res.send('🚍 Backend Web Buses rodando com sucesso!');
});

/* ───────── Inicialização ───────── */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});
