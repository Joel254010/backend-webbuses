// models/Anunciante.js
import mongoose from 'mongoose';

const anuncianteSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  telefone: { type: String, required: true },
  email: { type: String, required: true },
  documento: { type: String },
  endereco: { type: String },
  senha: { type: String, required: true },
  localizacao: {
    cidade: { type: String },
    estado: { type: String }
  }
}, {
  timestamps: true
});

const Anunciante = mongoose.model('Anunciante', anuncianteSchema);
export default Anunciante;
