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
import previewRoute from './routes/previewRoute.js';

dotenv.config();
conectarMongoDB();

const app = express();

/* ───────── Config ───────── */
app.set('trust proxy', 1);
app.set('etag', 'strong');
app.disable('x-powered-by');

/* ───────── Middlewares ───────── */
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
// ⛔️ era: app.options('*', cors());  → quebra no Express 5
app.options('(.*)', cors()); // ✅ Express 5 compat

app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

/* ───────── Rotas ───────── */
app.get('/healthz', (req, res) => res.status(200).send('ok'));

app.use('/api/anuncios', anuncioRoutes);
app.use('/api/anunciantes', anuncianteRoutes);
app.use('/api/curtidas', curtidaRoutes);
app.use('/preview', previewRoute);

app.get('/', (req, res) => {
  res.send('🚍 Backend Web Buses rodando com sucesso!');
});

/* ───────── Inicialização ───────── */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});
