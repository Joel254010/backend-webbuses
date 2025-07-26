// models/Anuncio.js

import mongoose from 'mongoose';

const anuncioSchema = new mongoose.Schema({
  nomeAnunciante: { type: String, required: true },
  anunciante: String, // link do WhatsApp
  email: String,
  telefone: String,
  telefoneBruto: String,

  tipoModelo: String,
  fabricanteCarroceria: String,
  modeloCarroceria: String,
  fabricanteChassis: String,
  modeloChassis: String,
  kilometragem: String,
  lugares: String,
  cor: String,
  anoModelo: String,
  valor: Number,
  descricao: String,

  fotoCapaUrl: String,
  imagens: [String],

  localizacao: {
    cidade: String,
    estado: String
  },

  status: { type: String, default: 'pendente' },
  dataCadastro: String,
  dataEnvio: String,
  dataCriacao: { type: Date, default: Date.now }
});

const Anuncio = mongoose.model('Anuncio', anuncioSchema);

export default Anuncio;
