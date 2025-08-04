import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import conectarMongoDB from './config/db.js';
import anuncioRoutes from './routes/anuncioRoutes.js';
import anuncianteRoutes from './routes/anuncianteRoutes.js';
import curtidaRoutes from './routes/curtidaRoutes.js';
import previewRoute from './routes/previewRoute.js'; // ✅ Open Graph

dotenv.config();
conectarMongoDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Rotas da API
app.use('/api/anuncios', anuncioRoutes);
app.use('/api/anunciantes', anuncianteRoutes);
app.use('/api/curtidas', curtidaRoutes);
app.use('/preview', previewRoute); // ✅ OG Image Preview

// Rota padrão
app.get('/', (req, res) => {
  res.send('🚍 Backend Web Buses rodando com sucesso!');
});

// Inicializa o servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});
