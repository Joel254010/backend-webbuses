// models/Anuncio.js
import mongoose from "mongoose";

const anuncioSchema = new mongoose.Schema(
  {
    nomeAnunciante: { type: String, required: true },
    anunciante: String,
    email: String,
    telefone: String,
    telefoneBruto: String,

    // Classificações / filtros
    tipoModelo: String,
    fabricanteCarroceria: String,
    modeloCarroceria: String,
    fabricanteChassis: String,
    modeloChassis: String,

    // Especificações
    kilometragem: String, // mantendo string para compatibilidade
    lugares: String,
    cor: String,
    anoModelo: String,

    // Preço
    valor: { type: Number, min: 0 },

    // Descrição
    descricao: { type: String, maxlength: 5000 },

    // Imagens (URLs servidas pela CDN do Cloudinary)
    fotoCapaUrl: String,      // URL da capa em tamanho normal
    fotoCapaThumb: String,    // URL da capa em thumb/preview
    imagens: [String],        // demais imagens (urls)

    // IDs do Cloudinary (para deletar/atualizar no futuro)
    fotoCapaPublicId: String,
    imagensPublicIds: [String],

    // Localização
    localizacao: {
      cidade: String,
      estado: String,
    },

    // Status
    status: { type: String, default: "pendente", index: true },

    // Datas
    dataCadastro: String,
    dataEnvio: String,
    dataCriacao: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

/* ──────────────────────────────────────────────────────────
   Índices para performance em listagens e filtros
────────────────────────────────────────────────────────── */
anuncioSchema.index({ status: 1, dataCriacao: -1 });
anuncioSchema.index({ anunciante: 1, status: 1, dataCriacao: -1 });
anuncioSchema.index({ tipoModelo: 1, status: 1, dataCriacao: -1 });
anuncioSchema.index({ dataCriacao: -1 });
anuncioSchema.index({ "localizacao.cidade": 1, "localizacao.estado": 1 });

/* ──────────────────────────────────────────────────────────
   Virtuais de compatibilidade (mantêm o frontend atual)
────────────────────────────────────────────────────────── */
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

const Anuncio = mongoose.model("Anuncio", anuncioSchema);
export default Anuncio;
