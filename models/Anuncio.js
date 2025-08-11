// models/Anuncio.js
import mongoose from "mongoose";

const anuncioSchema = new mongoose.Schema(
  {
    // ── Dados do anunciante ────────────────────────────────────────────────
    nomeAnunciante: { type: String, required: true },
    anunciante: String,
    email: String,
    telefone: String,
    telefoneBruto: String,

    // ── Especificações do veículo ─────────────────────────────────────────
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

    // ── Imagens ───────────────────────────────────────────────────────────
    // Mantemos o nome já usado no projeto
    fotoCapaUrl: String,
    // Thumb opcional para performance (se no futuro gerar miniatura)
    fotoCapaThumb: String,
    // Galeria (base64 ou URLs)
    imagens: [String],

    // ── Localização ───────────────────────────────────────────────────────
    localizacao: { cidade: String, estado: String },

    // ── Status / Datas ────────────────────────────────────────────────────
    status: { type: String, default: "pendente", index: true },
    dataCadastro: String,
    dataEnvio: String,
    dataCriacao: { type: Date, default: Date.now },
  },
  {
    // Não usamos timestamps automáticos porque já existe dataCriacao
    // timestamps: true,
  }
);

// ── Índices ───────────────────────────────────────────────────────────────
anuncioSchema.index({ status: 1, dataCriacao: -1 });
anuncioSchema.index({ anunciante: 1, status: 1, dataCriacao: -1 });
anuncioSchema.index({ tipoModelo: 1, status: 1, dataCriacao: -1 });
// Acesso recente geral
anuncioSchema.index({ dataCriacao: -1 });
// Busca leve por cidade/estado (apoia filtros no admin/home)
anuncioSchema.index({ "localizacao.cidade": 1, "localizacao.estado": 1 });

// ── Virtuals úteis ───────────────────────────────────────────────────────
// slug do modelo para rotas/amigáveis
anuncioSchema.virtual("slugModelo").get(function () {
  const raw = (this.tipoModelo || "").toLowerCase();
  if (raw.includes("utilit")) return "utilitarios";
  if (raw.includes("micro")) return "micro-onibus";
  if (raw.includes("4x2")) return "onibus-4x2";
  if (raw.includes("6x2")) return "onibus-6x2";
  if (raw.includes("urbano")) return "onibus-urbano";
  if (raw.includes("low")) return "lowdriver";
  if (raw.includes("double")) return "doubledecker";
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
});

// Capa com fallback: thumb → fotoCapaUrl → primeiro item de imagens
anuncioSchema.virtual("capa").get(function () {
  return (
    this.fotoCapaThumb ||
    this.fotoCapaUrl ||
    (Array.isArray(this.imagens) && this.imagens.length > 0 ? this.imagens[0] : null)
  );
});

// Compatibilidade com front-ends que esperam 'fotoCapa'
anuncioSchema.virtual("fotoCapa").get(function () {
  return this.capa;
});

// Incluir virtuals no retorno JSON/Objeto (para APIs e .lean())
anuncioSchema.set("toObject", { virtuals: true });
anuncioSchema.set("toJSON", { virtuals: true });

const Anuncio = mongoose.model("Anuncio", anuncioSchema);
export default Anuncio;
