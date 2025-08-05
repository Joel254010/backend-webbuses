// models/Anuncio.js
import mongoose from 'mongoose';

const anuncioSchema = new mongoose.Schema({
  // 🔸 Dados do anunciante
  nomeAnunciante: { type: String, required: true, index: true },
  anunciante: String, // link do WhatsApp
  email: { type: String, index: true, sparse: true },
  telefone: String,
  telefoneBruto: String,

  // 🔸 Especificações do veículo
  tipoModelo: { type: String, index: true },
  fabricanteCarroceria: { type: String, index: true },
  modeloCarroceria: String,
  fabricanteChassis: String,
  modeloChassis: String,
  kilometragem: String,
  lugares: String,
  cor: String,
  anoModelo: String,
  valor: { type: Number, min: 0, index: true },
  descricao: { type: String, maxlength: 5000 },

  // 🔸 Mídia
  fotoCapaUrl: String, // Apenas capa para listagem
  imagens: [String], // Todas imagens para página de detalhes

  // 🔸 Localização
  localizacao: {
    cidade: { type: String, index: true },
    estado: { type: String, index: true }
  },

  // 🔸 Controle
  status: { type: String, default: 'pendente', index: true },
  dataCadastro: { type: String },
  dataEnvio: { type: String },
  dataCriacao: { type: Date, default: Date.now, index: true }
});

// Criar índices compostos para acelerar buscas e filtros
anuncioSchema.index({ status: 1, dataCriacao: -1 });
anuncioSchema.index({ tipoModelo: 1, status: 1 });
anuncioSchema.index({ fabricanteCarroceria: 1, status: 1 });

const Anuncio = mongoose.model('Anuncio', anuncioSchema);

export default Anuncio;
