import Anuncio from "../models/Anuncio.js";
import cloudinary from "../config/cloudinary.js";
import { uploadBufferToCloudinary } from "../utils/cloudinaryUpload.js";

/** Helpers */
const ensureArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [val];
  } catch {
    return [val];
  }
};

const buildThumbUrl = (publicId) =>
  cloudinary.url(publicId, {
    secure: true,
    transformation: [
      { width: 480, height: 270, crop: "fill" },
      { quality: "auto" },
      { fetch_format: "auto" }
    ]
  });

const parseValor = (v) => {
  if (v === undefined || v === null || v === "") return undefined;
  const num = String(v).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = parseFloat(num);
  return Number.isNaN(parsed) ? undefined : parsed;
};

// [KM] pega o primeiro campo de KM que vier preenchido (texto cru, sem formatar)
const firstNonEmpty = (...vals) => {
  for (const v of vals) {
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return undefined;
};

/** Criar anúncio (suporta multipart + JSON) */
export const criarAnuncio = async (req, res) => {
  try {
    const {
      nomeAnunciante,
      anunciante,
      email,
      telefone,
      telefoneBruto,
      fabricanteCarroceria,
      modeloCarroceria,
      fabricanteChassis,
      modeloChassis,
      kilometragem, // [KM] texto livre do anunciante
      lugares,
      cor,
      anoModelo,
      localizacao,
      valor,
      descricao,
      tipoModelo,
      fotoCapaUrl,  // opcional (link direto)
      imagens,      // opcional (array/link)
      status,
      dataEnvio
    } = req.body;

    // Uploads vindos do Multer (capa + imagens)
    const capaFile = req.files?.capa?.[0];
    const imageFiles = req.files?.imagens || [];

    let capaUrl = fotoCapaUrl || null;
    let capaPublicId = null;
    let capaThumb = null;

    // Se veio arquivo de capa, sobe para o Cloudinary
    if (capaFile) {
      const up = await uploadBufferToCloudinary(capaFile.buffer, capaFile.originalname, "webbuses");
      capaUrl = up.secure_url;
      capaPublicId = up.public_id;
      capaThumb = buildThumbUrl(up.public_id);
    }

    // Demais imagens (arquivos)
    const imagensUrls = [];
    const imagensPublicIds = [];
    for (const f of imageFiles) {
      const up = await uploadBufferToCloudinary(f.buffer, f.originalname, "webbuses");
      imagensUrls.push(up.secure_url);
      imagensPublicIds.push(up.public_id);
    }

    // Se não veio arquivo, mas veio link(s) no body, aproveita
    const imagensBody = ensureArray(imagens);
    for (const link of imagensBody) {
      if (typeof link === "string" && link.trim()) imagensUrls.push(link.trim());
    }

    // Se não tem capa, usa a primeira imagem
    if (!capaUrl && imagensUrls.length > 0) capaUrl = imagensUrls[0];

    if (!capaUrl) {
      return res.status(400).json({ mensagem: "Foto de capa é obrigatória." });
    }

    // Normaliza localizacao (string "Cidade, Estado" ou objeto)
    let loc = { cidade: undefined, estado: undefined };
    if (typeof localizacao === "string") {
      const [cidade, estado] = localizacao.split(",").map(s => s?.trim());
      loc = { cidade: cidade || "-", estado: estado || "-" };
    } else if (localizacao && typeof localizacao === "object") {
      loc = {
        cidade: localizacao.cidade || "-",
        estado: localizacao.estado || "-"
      };
    }

    const novoAnuncio = new Anuncio({
      nomeAnunciante,
      anunciante,
      email,
      telefone,
      telefoneBruto,
      fabricanteCarroceria,
      modeloCarroceria,
      fabricanteChassis,
      modeloChassis,
      kilometragem,          // [KM] salva exatamente o texto digitado
      lugares,
      cor,
      anoModelo,
      localizacao: loc,
      valor: parseValor(valor),
      descricao,
      tipoModelo,

      // Imagens/Cloudinary
      fotoCapaUrl: capaUrl,
      fotoCapaThumb: capaThumb || null,
      imagens: imagensUrls,
      fotoCapaPublicId: capaPublicId || null,
      imagensPublicIds,

      // Metadados
      status: status || "pendente",
      dataEnvio: dataEnvio || new Date()
    });

    await novoAnuncio.save();
    return res.status(201).json(novoAnuncio);
  } catch (erro) {
    console.error("Erro ao criar anúncio:", erro);
    return res.status(500).json({ mensagem: "Erro ao criar anúncio" });
  }
};

/** Listar anúncios (rápido; suporta paginação e filtros por querystring) */
export const listarAnuncios = async (req, res) => {
  try {
    const {
      page,
      limit,
      status,
      tipoModelo,
      cidade,
      estado
    } = req.query;

    const filtro = {};
    if (status) filtro.status = status;
    if (tipoModelo) filtro.tipoModelo = tipoModelo;
    if (cidade) filtro["localizacao.cidade"] = cidade;
    if (estado) filtro["localizacao.estado"] = estado;

    const projection = {
      nomeAnunciante: 1,
      anunciante: 1,
      email: 1,
      telefone: 1,
      telefoneBruto: 1,
      fabricanteCarroceria: 1,
      modeloCarroceria: 1,
      tipoModelo: 1,
      valor: 1,
      status: 1,
      fotoCapaUrl: 1,
      fotoCapaThumb: 1,
      dataEnvio: 1,
      localizacao: 1,
      // [KM] incluir TODAS as variantes como texto cru
      kilometragem: 1,
      kilometragemAtual: 1,
      km: 1,
      rodagem: 1,
      quilometragem: 1,
      quilometragemAtual: 1
    };

    const query = Anuncio.find(filtro, projection).sort({ dataEnvio: -1, _id: -1 }).lean();

    // Paginação opcional: ?page=1&limit=12
    let total;
    if (limit) {
      const pageNum = Math.max(parseInt(page || "1", 10), 1);
      const limitNum = Math.max(parseInt(limit, 10), 1);
      const skip = (pageNum - 1) * limitNum;
      [total] = await Promise.all([
        Anuncio.countDocuments(filtro),
        query.skip(skip).limit(limitNum)
      ]);
      query.skip(skip).limit(limitNum);
      res.set("X-Total-Count", String(total || 0));
    }

    const docs = await query.exec();

    // [KM] adiciona kmLabel (texto cru) para conveniência no frontend
    const anuncios = docs.map((d) => ({
      ...d,
      kmLabel: firstNonEmpty(
        d.kilometragem,
        d.kilometragemAtual,
        d.km,
        d.rodagem,
        d.quilometragem,
        d.quilometragemAtual
      )
    }));

    return res.json(anuncios);
  } catch (erro) {
    console.error("Erro ao listar anúncios:", erro);
    return res.status(500).json({ mensagem: "Erro ao listar anúncios" });
  }
};

/** Buscar por ID */
export const buscarAnuncioPorId = async (req, res) => {
  try {
    const anuncio = await Anuncio.findById(req.params.id).lean();
    if (!anuncio) return res.status(404).json({ mensagem: "Anúncio não encontrado" });
    return res.json(anuncio);
  } catch (erro) {
    console.error("Erro ao buscar anúncio:", erro);
    return res.status(500).json({ mensagem: "Erro ao buscar anúncio" });
  }
};

/** Atualizar status */
export const atualizarStatusAnuncio = async (req, res) => {
  try {
    const { status } = req.body;
    const anuncio = await Anuncio.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).lean();
    if (!anuncio) return res.status(404).json({ mensagem: "Anúncio não encontrado" });
    return res.json(anuncio);
  } catch (erro) {
    console.error("Erro ao atualizar status:", erro);
    return res.status(500).json({ mensagem: "Erro ao atualizar status" });
  }
};

/** Excluir anúncio (remove imagens do Cloudinary se existirem) */
export const excluirAnuncio = async (req, res) => {
  try {
    const anuncio = await Anuncio.findById(req.params.id);
    if (!anuncio) return res.status(404).json({ mensagem: "Anúncio não encontrado" });

    const ids = [];
    if (anuncio.fotoCapaPublicId) ids.push(anuncio.fotoCapaPublicId);
    if (Array.isArray(anuncio.imagensPublicIds) && anuncio.imagensPublicIds.length) {
      ids.push(...anuncio.imagensPublicIds);
    }

    // Apaga imagens no Cloudinary (ignora erros individuais)
    for (const pid of ids) {
      try {
        await cloudinary.uploader.destroy(pid, { invalidate: true, resource_type: "image" });
      } catch (e) {
        console.warn("Falha ao deletar no Cloudinary:", pid, e?.message);
      }
    }

    await anuncio.deleteOne();
    return res.json({ mensagem: "Anúncio excluído com sucesso" });
  } catch (erro) {
    console.error("Erro ao excluir anúncio:", erro);
    return res.status(500).json({ mensagem: "Erro ao excluir anúncio" });
  }
};
