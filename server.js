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
app.use(
  cors({
    origin: true,
    credentials: true,
    maxAge: 86400,
  })
);
// ❌ REMOVIDO: app.options('(.*)', cors());

app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

app.get('/healthz', (req, res) => res.status(200).send('ok'));

app.use('/api/anuncios', anuncioRoutes);
app.use('/api/anunciantes', anuncianteRoutes);
app.use('/api/curtidas', curtidaRoutes);
app.use('/preview', previewRoute);

app.get('/', (req, res) => {
  res.send('🚍 Backend Web Buses rodando com sucesso!');
});

// antes: conectarMongoDB(); app.listen(...)

const PORT = process.env.PORT || 5000;

try {
  await conectarMongoDB();            // ✅ espere a conexão (Node 20+ suporta top-level await)
  app.listen(PORT, () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
  });
} catch (err) {
  console.error("❌ Falha ao conectar no MongoDB:", err);
  process.exit(1);
}
