import mongoose from "mongoose";

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
  fotoCapaThumb: String,
  imagens: [String],
  localizacao: { cidade: String, estado: String },
  status: { type: String, default: "pendente", index: true },
  dataCadastro: String,
  dataEnvio: String,
  dataCriacao: { type: Date, default: Date.now }
});

anuncioSchema.index({ status: 1, dataCriacao: -1 });
anuncioSchema.index({ anunciante: 1, status: 1, dataCriacao: -1 });
anuncioSchema.index({ tipoModelo: 1, status: 1, dataCriacao: -1 });
anuncioSchema.index({ dataCriacao: -1 });
anuncioSchema.index({ "localizacao.cidade": 1, "localizacao.estado": 1 });

anuncioSchema.virtual("capa").get(function () {
  return (
    this.fotoCapaThumb ||
    this.fotoCapaUrl ||
    (Array.isArray(this.imagens) && this.imagens.length > 0 ? this.imagens[0] : null)
  );
});

anuncioSchema.virtual("fotoCapa").get(function () {
  return this.capa;
});

anuncioSchema.set("toObject", { virtuals: true });
anuncioSchema.set("toJSON", { virtuals: true });

const Anuncio = mongoose.model("Anuncio", anuncioSchema);
export default Anuncio;
