// controllers/anuncioController.js
import mongoose from 'mongoose';
import Anuncio from '../models/Anuncio.js';

/* ──────────────────────────────────────────────────────────
   Utils
────────────────────────────────────────────────────────── */
function getBaseUrl(req) {
  const proto = req.get('x-forwarded-proto') || req.protocol;
  const host = req.get('x-forwarded-host') || req.get('host');
  return `${proto}://${host}`;
}

/* ──────────────────────────────────────────────────────────
   Cache leve de respostas JSON
────────────────────────────────────────────────────────── */
const CACHE_TTL = 60_000; // 60s
const MAX_CACHE = 100;
const cache = new Map();
const k = (name, q) => `${name}:${JSON.stringify(q)}`;

function setCache(key, payload) {
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
  cache.set(key, { when: Date.now(), payload });
}
function invalidateListCaches() {
  for (const key of cache.keys()) if (key.startsWith('listar:')) cache.delete(key);
}

/* ──────────────────────────────────────────────────────────
   Helpers de IMAGEM (resize + cache em memória)
   - usa sharp se disponível; caso contrário retorna original
   - aceita query ?w (largura), ?q (qualidade), ?format=webp|jpeg|png|avif
────────────────────────────────────────────────────────── */
const IMG_CACHE_TTL = 60 * 60 * 1000; // 1h
const IMG_CACHE_MAX = 200;
const imgCache = new Map(); // cacheId|w|q|fmt -> { when, mime, buf }

function imgKey({ cacheId, w, q, format }) {
  return `${cacheId}|w=${w}|q=${q}|f=${format}`;
}
function getImgCache(key) {
  const hit = imgCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.when > IMG_CACHE_TTL) { imgCache.delete(key); return null; }
  return hit;
}
function setImgCache(key, mime, buf) {
  if (imgCache.size >= IMG_CACHE_MAX) imgCache.delete(imgCache.keys().next().value);
  imgCache.set(key, { when: Date.now(), mime, buf });
}

async function decodeBase64OrDataUri(source) {
  let mime = 'image/jpeg';
  let b64  = source || '';
  const m  = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/i.exec(b64);
  if (m) { mime = m[1]; b64 = m[2]; }
  const buf = Buffer.from(b64, 'base64');
  return { mime, buf };
}

async function maybeSharpResize(buf, { w = 0, q = 75, format = 'webp' } = {}) {
  if (!w || w <= 0) return { mime: 'image/jpeg', buf };
  let sharp;
  try { sharp = (await import('sharp')).default; }
  catch { return { mime: 'image/jpeg', buf }; }

  const fmts = { webp: 'image/webp', jpeg: 'image/jpeg', jpg: 'image/jpeg', png: 'image/png', avif: 'image/avif' };
  const outMime = fmts[format] || 'image/webp';

  const out = await sharp(buf)
    .rotate()
    .resize({ width: w, withoutEnlargement: true })
    .toFormat(format === 'jpg' ? 'jpeg' : format, { quality: q })
    .toBuffer();

  return { mime: outMime, buf: out };
}

async function sendImageFromSource(res, source, {
  w = 0, q = 75, format = 'webp', cacheId = '', etagBase = ''
} = {}) {
  const key = imgKey({ cacheId, w, q, format });
  const hit = getImgCache(key);
  if (hit) {
    res.set('Content-Type', hit.mime);
    res.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    if (etagBase) res.set('ETag', `"${etagBase}-${w}-${q}-${format}"`);
    res.set('Content-Length', String(hit.buf.length));
    return res.status(200).send(hit.buf);
  }

  const { buf: raw } = await decodeBase64OrDataUri(source);
  const { mime, buf } = await maybeSharpResize(raw, { w, q, format });

  setImgCache(key, mime, buf);

  res.set('Content-Type', mime);
  res.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
  if (etagBase) res.set('ETag', `"${etagBase}-${w}-${q}-${format}"`);
  res.set('Content-Length', String(buf.length));
  return res.status(200).send(buf);
}

/* ──────────────────────────────────────────────────────────
   Resolver de fonte de imagem:
   - data URI → {type:'data', value:<mesmo>}
   - http/https → {type:'url', value:<mesmo>}
   - nome de arquivo → {type:'url', value: <PUBLIC_UPLOADS_URL>/<arquivo>}
────────────────────────────────────────────────────────── */
function resolveFonteToUrlOrData(raw) {
  if (!raw) return { type: 'none', value: null };
  const s = String(raw);

  // URL completa
  if (/^https?:\/\//i.test(s)) return { type: 'url', value: s };

  // data URI
  if (/^data:image\//i.test(s)) return { type: 'data', value: s };

  // nome de arquivo (ex.: photo-123.png) → usa PUBLIC_UPLOADS_URL (ou PUBLIC_API_URL + /uploads)
  const uploadsBase =
    (process.env.PUBLIC_UPLOADS_URL && process.env.PUBLIC_UPLOADS_URL.replace(/\/+$/, '')) ||
    ((process.env.PUBLIC_API_URL && `${process.env.PUBLIC_API_URL.replace(/\/+$/, '')}/uploads`) || null);

  if (uploadsBase) {
    const path = s.replace(/^\/+/, '');
    return { type: 'url', value: `${uploadsBase}/${path}` };
  }

  // sem base configurada, devolve como "desconhecido" (deixa o caller decidir)
  return { type: 'unknown', value: s };
}

/* ──────────────────────────────────────────────────────────
   Criar novo anúncio  (CAPA OBRIGATÓRIA)
────────────────────────────────────────────────────────── */
export const criarAnuncio = async (req, res) => {
  try {
    const novo = new Anuncio(req.body);

    if (!novo.fotoCapaUrl && !(Array.isArray(novo.imagens) && novo.imagens.length > 0)) {
      return res.status(400).json({ erro: "Foto de capa é obrigatória." });
    }
    if (!novo.fotoCapaUrl && novo.imagens.length > 0) {
      novo.fotoCapaUrl = novo.imagens[0];
    }

    const salvo = await novo.save();
    invalidateListCaches();
    res.status(201).json({ mensagem: "Anúncio salvo com sucesso!", anuncio: salvo });
  } catch (erro) {
    res.status(500).json({ erro: "Erro ao salvar o anúncio", detalhes: erro.message });
  }
};

/* ──────────────────────────────────────────────────────────
   Listar anúncios (Home / Meus Anúncios) — LEVE
────────────────────────────────────────────────────────── */
export const listarAnuncios = async (req, res) => {
  try {
    const pageRaw  = parseInt(req.query.page);
    const limitRaw = parseInt(req.query.limit);
    const page  = Math.max(Number.isFinite(pageRaw) ? pageRaw : 1, 1);
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 20, 1), 50);
    const skip  = (page - 1) * limit;

    const filtro = { status: "aprovado" };
    if (req.query.anuncianteId) filtro.anunciante = req.query.anuncianteId;
    if (req.query.tipoModelo)   filtro.tipoModelo = req.query.tipoModelo;

    const cacheKey = k('listar', { page, limit, filtro });
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.when < CACHE_TTL) {
      res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
      return res.json({ ...hit.payload, origem: "cache" });
    }

    const pipeline = [
      { $match: filtro },
      { $sort: { dataCriacao: -1 } },
      {
        $project: {
          _id: 1,
          nomeAnunciante: 1,
          telefone: 1,
          telefoneBruto: 1,
          email: 1,
          tipoModelo: 1,
          fabricanteCarroceria: 1,
          modeloCarroceria: 1,
          kilometragem: 1,
          valor: 1,
          localizacao: 1,
          status: 1,
          dataCriacao: 1
        }
      },
      { $skip: skip },
      { $limit: limit }
    ];

    const agg = Anuncio.aggregate(pipeline).allowDiskUse(true).option({ maxTimeMS: 15000 });
    const [anuncios, total] = await Promise.all([ agg.exec(), Anuncio.countDocuments(filtro) ]);

    // capa leve por padrão (ótimo para cards da Home)
    const apiBase = process.env.PUBLIC_API_URL || getBaseUrl(req);
    for (const a of anuncios) {
      a.capaUrl = `${apiBase}/api/anuncios/${a._id}/capa?w=480&q=70&format=webp`;
    }

    const payload = {
      anuncios,
      paginaAtual: page,
      totalPaginas: Math.ceil(total / limit) || 1,
      totalAnuncios: total,
      origem: "banco"
    };

    setCache(cacheKey, payload);
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    return res.json(payload);
  } catch (erro) {
    res.status(500).json({ erro: "Erro ao buscar anúncios", detalhes: erro.message });
  }
};

/* ──────────────────────────────────────────────────────────
   Listar TODOS (Admin) — leve por padrão + capa garantida
────────────────────────────────────────────────────────── */
export const listarTodosAnunciosAdmin = async (req, res) => {
  try {
    const pageRaw  = parseInt(req.query.page);
    const limitRaw = parseInt(req.query.limit);
    // default menor para acelerar o Admin
    const page  = Math.max(Number.isFinite(pageRaw) ? pageRaw : 1, 1);
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 24, 1), 100);
    const skip  = (page - 1) * limit;
    const full  = (req.query.full === '1');

    const filtro = {};
    if (req.query.status)       filtro.status = req.query.status;
    if (req.query.anuncianteId) filtro.anunciante = req.query.anuncianteId;
    if (req.query.tipoModelo)   filtro.tipoModelo = req.query.tipoModelo;
    if (req.query.search) {
      const rx = new RegExp(req.query.search, 'i');
      filtro.$or = [
        { nomeAnunciante: rx },
        { email: rx },
        { telefone: rx },
        { 'localizacao.cidade': rx },
        { 'localizacao.estado': rx },
        { tipoModelo: rx },
      ];
    }

    const projectionBase = {
      nomeAnunciante: 1,
      anunciante: 1,
      email: 1,
      telefone: 1,
      telefoneBruto: 1,
      tipoModelo: 1,
      fabricanteCarroceria: 1,
      modeloCarroceria: 1,
      fabricanteChassis: 1,
      modeloChassis: 1,
      kilometragem: 1,
      lugares: 1,
      cor: 1,
      anoModelo: 1,
      valor: 1,
      fotoCapaUrl: 1,
      localizacao: 1,
      status: 1,
      dataCadastro: 1,
      dataEnvio: 1,
      dataCriacao: 1
    };

    const projectStage = full
      ? { ...projectionBase, descricao: 1, imagens: 1 }
      : {
          ...projectionBase,
          imagensCount: { $size: { $ifNull: ["$imagens", []] } },
          temCapa: {
            $cond: {
              if: {
                $or: [
                  { $gt: [{ $strLenCP: { $ifNull: ["$fotoCapaUrl", ""] } }, 0] },
                  { $gt: [{ $size: { $ifNull: ["$imagens", []] } }, 0] }
                ]
              },
              then: true,
              else: false
            }
          }
        };

    const pipeline = [
      { $match: filtro },
      { $sort: { dataCriacao: -1 } },
      { $project: projectStage },
      { $skip: skip },
      { $limit: limit }
    ];

    const agg = Anuncio.aggregate(pipeline).allowDiskUse(true).option({ maxTimeMS: 15000 });
    const [items, total] = await Promise.all([ agg.exec(), Anuncio.countDocuments(filtro) ]);

    // Garante 'capaUrl' para o Admin
    const apiBase = process.env.PUBLIC_API_URL || getBaseUrl(req);
    for (const it of items) {
      it.capaUrl = `${apiBase}/api/anuncios/${it._id}/capa?w=480&q=70&format=webp`;
    }

    res.set("Cache-Control", "private, max-age=0, must-revalidate");
    return res.json({
      data: items,
      paginaAtual: page,
      totalPaginas: Math.ceil(total / limit) || 1,
      total
    });
  } catch (erro) {
    res.status(500).json({ erro: "Erro ao buscar todos os anúncios (admin)", detalhes: erro.message });
  }
};

/* ──────────────────────────────────────────────────────────
   Capa de anúncio (foto oficial)
   - suporta ?w ?q ?format
   - redireciona se fonte virar URL (http/https/uploads)
   - 304 If-None-Match suportado
────────────────────────────────────────────────────────── */
export const obterCapaAnuncio = async (req, res) => {
  try {
    const { id } = req.params;
    const w = Math.max(parseInt(req.query.w || '0', 10) || 0, 0);
    const q = Math.min(Math.max(parseInt(req.query.q || '75', 10) || 75, 20), 95);
    const format = (req.query.format || 'webp').toLowerCase();

    const a = await Anuncio.findById(
      id,
      { fotoCapaUrl: 1, imagens: { $slice: 1 }, dataCriacao: 1 }
    ).lean();

    if (!a) return res.status(404).send('Anúncio não encontrado');

    const fonteRaw = a.fotoCapaUrl ?? (Array.isArray(a.imagens) ? a.imagens[0] : null);
    const fonteObj = resolveFonteToUrlOrData(fonteRaw);
    const fonte = fonteObj.value;

    if (!fonte) return res.status(404).send('Capa não encontrada');

    // URL (http/https/uploads) → redireciona SEMPRE
    if (fonteObj.type === 'url') {
      res.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      return res.redirect(302, fonte);
    }

    const createdAt = a?.dataCriacao ? new Date(a.dataCriacao).getTime() : '0';
    const etagBase = `capa-${id}-${createdAt}`;
    const expectedEtag = `"${etagBase}-${w}-${q}-${format}"`;
    if (req.headers['if-none-match'] === expectedEtag) {
      res.set('ETag', expectedEtag);
      return res.status(304).end();
    }

    // data URI → processa/resize e envia
    return sendImageFromSource(res, fonte, {
      w, q, format,
      cacheId: `capa:${id}:${createdAt}`,
      etagBase
    });
  } catch (erro) {
    console.error('capa erro:', erro);
    return res.status(500).send('Erro ao obter capa');
  }
};

/* ──────────────────────────────────────────────────────────
   META sem imagens (rápido para a página de detalhes)
────────────────────────────────────────────────────────── */
export const obterAnuncioMeta = async (req, res) => {
  try {
    const { id } = req.params;

    const [doc] = await Anuncio.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $project: {
          nomeAnunciante: 1,
          anunciante: 1,
          email: 1,
          telefone: 1,
          telefoneBruto: 1,
          tipoModelo: 1,
          fabricanteCarroceria: 1,
          modeloCarroceria: 1,
          fabricanteChassis: 1,
          modeloChassis: 1,
          kilometragem: 1,
          lugares: 1,
          cor: 1,
          anoModelo: 1,
          valor: 1,
          descricao: 1,
          localizacao: 1,
          fotoCapaUrl: 1,
          dataCriacao: 1,
          imagensCount: { $size: { $ifNull: ["$imagens", []] } }
        }
      }
    ]);

    if (!doc) return res.status(404).json({ erro: "Anúncio não encontrado." });

    const apiBase = process.env.PUBLIC_API_URL || getBaseUrl(req);
    doc.capaUrl =
      (doc.fotoCapaUrl && /^https?:\/\//i.test(doc.fotoCapaUrl))
        ? doc.fotoCapaUrl
        : `${apiBase}/api/anuncios/${id}/capa?w=1280&q=75&format=webp`;

    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    return res.json(doc);
  } catch (erro) {
    return res.status(500).json({ erro: "Erro ao buscar meta", detalhes: erro.message });
  }
};

/* ──────────────────────────────────────────────────────────
   Foto por índice (stream)
   - suporta ?w ?q ?format — ideal p/ thumbs (ex.: w=220)
   - redireciona se for URL (http/https/uploads)
   - 304 If-None-Match suportado
────────────────────────────────────────────────────────── */
export const obterFotoAnuncioPorIndice = async (req, res) => {
  try {
    const { id, idx } = req.params;
    const index  = Math.max(parseInt(idx, 10) || 0, 0);

    const w = Math.max(parseInt(req.query.w || '0', 10) || 0, 0);
    const q = Math.min(Math.max(parseInt(req.query.q || '75', 10) || 75, 20), 95);
    const format = (req.query.format || 'webp').toLowerCase();

    const a = await Anuncio.findById(id, { imagens: 1, dataCriacao: 1 }).lean();
    if (!a) return res.status(404).send('Anúncio não encontrado');

    const candRaw = Array.isArray(a.imagens) ? a.imagens[index] : null;
    const candObj = resolveFonteToUrlOrData(candRaw);
    const cand = candObj.value;

    if (!cand) {
      const webBase = process.env.PUBLIC_WEB_URL || 'https://webbuses.com';
      return res.redirect(302, `${webBase}/logo.png`);
    }

    // URL (http/https/uploads) → redireciona
    if (candObj.type === 'url') {
      res.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      return res.redirect(302, cand);
    }

    const createdAt = a?.dataCriacao ? new Date(a.dataCriacao).getTime() : '0';
    const etagBase = `foto-${id}-${index}-${createdAt}`;
    const expectedEtag = `"${etagBase}-${w}-${q}-${format}"`;
    if (req.headers['if-none-match'] === expectedEtag) {
      res.set('ETag', expectedEtag);
      return res.status(304).end();
    }

    // data URI → processa/resize e envia
    return sendImageFromSource(res, cand, {
      w, q, format,
      cacheId: `foto:${id}:${index}:${createdAt}`,
      etagBase
    });
  } catch (erro) {
    return res.status(500).send('Erro ao obter foto');
  }
};

/* ──────────────────────────────────────────────────────────
   Atualizações e exclusão
────────────────────────────────────────────────────────── */
export const atualizarStatusAnuncio = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const atualizado = await Anuncio.findByIdAndUpdate(
      id, { status }, { new: true, runValidators: true, projection: { __v: 0 } }
    ).lean();
    invalidateListCaches();
    if (!atualizado) return res.status(404).json({ erro: "Anúncio não encontrado." });
    res.json({ mensagem: "Status atualizado com sucesso", anuncio: atualizado });
  } catch (erro) {
    res.status(500).json({ erro: "Erro ao atualizar status", detalhes: erro.message });
  }
};

export const atualizarAnuncio = async (req, res) => {
  const { id } = req.params;
  const dados = req.body || {};
  try {
    // Só aplica regra de capa se o campo 'imagens' vier na atualização
    if (Object.prototype.hasOwnProperty.call(dados, 'imagens')) {
      if (!dados.fotoCapaUrl && Array.isArray(dados.imagens) && dados.imagens.length > 0) {
        dados.fotoCapaUrl = dados.imagens[0];
      }
      if (!dados.fotoCapaUrl && Array.isArray(dados.imagens) && dados.imagens.length === 0) {
        return res.status(400).json({ erro: "Foto de capa é obrigatória." });
      }
    }

    const atualizado = await Anuncio.findByIdAndUpdate(
      id, dados, { new: true, runValidators: true, projection: { __v: 0 } }
    ).lean();
    invalidateListCaches();
    if (!atualizado) return res.status(404).json({ erro: "Anúncio não encontrado." });
    res.json({ mensagem: "Anúncio atualizado com sucesso", anuncio: atualizado });
  } catch (erro) {
    res.status(500).json({ erro: "Erro ao atualizar anúncio", detalhes: erro.message });
  }
};

export const excluirAnuncio = async (req, res) => {
  const { id } = req.params;
  try {
    const removido = await Anuncio.findByIdAndDelete(id, { projection: { __v: 0 } }).lean();
    invalidateListCaches();
    if (!removido) return res.status(404).json({ erro: "Anúncio não encontrado." });
    res.json({ mensagem: "Anúncio excluído com sucesso" });
  } catch (erro) {
    res.status(500).json({ erro: "Erro ao excluir anúncio", detalhes: erro.message });
  }
};
