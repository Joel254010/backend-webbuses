// models/Curtida.js
const mongoose = require("mongoose");

const CurtidaSchema = new mongoose.Schema({
  anuncioId: { type: String, required: true },
  ip: { type: String, required: true },
  criadoEm: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Curtida", CurtidaSchema);
