// models/Anuncio.js
import mongoose from 'mongoose';

const anuncioSchema = new mongoose.Schema({
  nomeAnunciante: { type: String, required: true },
  anunciante: String,
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
  valor: { type: Number, min: 0 },
  descricao: { type: String, maxlength: 5000 },

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

// Índice de busca
anuncioSchema.index({ status: 1, dataCriacao: -1 });

/* ✅ Campo virtual: slugModelo para facilitar filtros */
anuncioSchema.virtual('slugModelo').get(function () {
  const raw = (this.tipoModelo || "").toLowerCase();

  if (raw.includes("utilit")) return "utilitarios";
  if (raw.includes("micro")) return "micro-onibus";
  if (raw.includes("4x2")) return "onibus-4x2";
  if (raw.includes("6x2")) return "onibus-6x2";
  if (raw.includes("urbano")) return "onibus-urbano";
  if (raw.includes("low")) return "lowdriver";          // ✅ atualizado
  if (raw.includes("double")) return "doubledecker";    // ✅ atualizado

  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
});

// ✅ Exportar com virtuais ativados
anuncioSchema.set("toObject", { virtuals: true });
anuncioSchema.set("toJSON", { virtuals: true });

const Anuncio = mongoose.model('Anuncio', anuncioSchema);
export default Anuncio;
