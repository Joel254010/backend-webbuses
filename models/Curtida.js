// models/Curtida.js
import mongoose from 'mongoose';

const CurtidaSchema = new mongoose.Schema({
  anuncioId: String,
  ip: String,
});

const Curtida = mongoose.model('Curtida', CurtidaSchema);

export default Curtida;
