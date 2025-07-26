// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import conectarMongoDB from './config/db.js'; // ✅ import da conexão
import anuncioRoutes from './routes/anuncioRoutes.js';

dotenv.config();
conectarMongoDB(); // ✅ conecta ao MongoDB

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/anuncios', anuncioRoutes);

const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
  res.send('🚍 Backend Web Buses rodando com sucesso!');
});

app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});
