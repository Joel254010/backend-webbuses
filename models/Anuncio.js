import mongoose from 'mongoose';

const anuncioSchema = new mongoose.Schema({
  // 🔸 Dados do anunciante
  nomeAnunciante: { type: String, required: true },
  anunciante: String, // link do WhatsApp
  email: String,
  telefone: String,
  telefoneBruto: String,

  // 🔸 Especificações do veículo
  tipoModelo: String,
  fabricanteCarroceria: String,
  modeloCarroceria: String,
  fabricanteChassis: String,
  modeloChassis: String,
  kilometragem: String,
  lugares: String,
  cor: String,
  anoModelo: String,
  valor: { type: Number, min: 0 },
  descricao: { type: String, maxlength: 5000 },

  // 🔸 Mídia
  fotoCapaUrl: String,
  imagens: [String],

  // 🔸 Localização
  localizacao: {
    cidade: String,
    estado: String
  },

  // 🔸 Controle
  status: { type: String, default: 'pendente' },
  dataCadastro: { type: String }, // ou: Date
  dataEnvio: { type: String }, // ou: Date
  dataCriacao: { type: Date, default: Date.now }
});

const Anuncio = mongoose.model('Anuncio', anuncioSchema);

export default Anuncio;
