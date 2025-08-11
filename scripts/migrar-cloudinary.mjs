import 'dotenv/config';
import mongoose from 'mongoose';
import cloudinary from '../config/cloudinary.js';
import Anuncio from '../models/Anuncio.js';

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!uri) {
  console.error('Falta MONGODB_URI no .env');
  process.exit(1);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const isCloudinaryUrl = (u='') => typeof u === 'string' && u.includes('res.cloudinary.com');

const uploadOne = async (source, folder='webbuses') => {
  if (!source) return null;
  // Se já é um link Cloudinary, não reenvia
  if (isCloudinaryUrl(source)) {
    return { secure_url: source, public_id: null, reused: true };
  }
  return await cloudinary.uploader.upload(source, {
    folder,
    resource_type: 'image',
    use_filename: true,
    unique_filename: true,
    overwrite: false,
    transformation: [
      { width: 1280, height: 720, crop: 'limit' },
      { quality: 'auto' },
      { fetch_format: 'auto' }
    ]
  });
};

const thumbFromPublicId = (publicId) => publicId
  ? cloudinary.url(publicId, {
      secure: true,
      transformation: [
        { width: 480, height: 270, crop: 'fill' },
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    })
  : null;

(async function main() {
  const DRY = /^true$/i.test(process.env.DRY_RUN || 'false');
  const LIMIT = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || '0', 10);

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  console.log('✅ Conectado ao Mongo para MIGRAÇÃO');

  // pega anúncios sem public_id de capa (ainda não migrados)
  const filtro = { $or: [ { fotoCapaPublicId: { $exists: false } }, { fotoCapaPublicId: null } ] };
  let query = Anuncio.find(filtro).sort({ dataCriacao: 1 });
  if (LIMIT > 0) query = query.limit(LIMIT);

  const docs = await query.exec();
  console.log(`➡️  Encontrados ${docs.length} anúncios para migrar ${LIMIT ? `(limit ${LIMIT})` : ''}`);

  let migrated = 0, skipped = 0, errors = 0;

  for (const doc of docs) {
    try {
      const id = String(doc._id);
      const alreadyCloudCapa = isCloudinaryUrl(doc.fotoCapaUrl);
      const hasPublicId = !!doc.fotoCapaPublicId;

      if (hasPublicId && alreadyCloudCapa) {
        skipped++;
        continue;
      }

      const imagensArr = Array.isArray(doc.imagens) ? doc.imagens : [];
      let capaSource = doc.fotoCapaUrl || imagensArr[0] || null;
      if (!capaSource && imagensArr.length > 0) capaSource = imagensArr[0];

      if (!capaSource) {
        console.warn(`⚠️  [${id}] Sem imagem para capa; pulando`);
        skipped++;
        continue;
      }

      let capaUp = { secure_url: doc.fotoCapaUrl || null, public_id: doc.fotoCapaPublicId || null, reused: false };
      if (!alreadyCloudCapa || !hasPublicId) {
        if (DRY) {
          console.log(`(dry-run) Subiria capa do anúncio ${id}`);
        } else {
          capaUp = await uploadOne(capaSource, 'webbuses');
          await sleep(300);
        }
      }

      const novasImagens = [];
      const novosIds = [];
      for (const img of imagensArr) {
        if (isCloudinaryUrl(img)) {
          novasImagens.push(img);
          continue;
        }
        if (DRY) {
          console.log(`(dry-run) Subiria imagem extra do anúncio ${id}`);
          continue;
        }
        const up = await uploadOne(img, 'webbuses');
        if (up?.secure_url) novasImagens.push(up.secure_url);
        if (up?.public_id) novosIds.push(up.public_id);
        await sleep(200);
      }

      if (!DRY) {
        doc.fotoCapaUrl      = capaUp?.secure_url || doc.fotoCapaUrl || null;
        doc.fotoCapaPublicId = capaUp?.public_id || doc.fotoCapaPublicId || null;
        doc.fotoCapaThumb    = thumbFromPublicId(doc.fotoCapaPublicId) || doc.fotoCapaThumb || null;

        if (novasImagens.length) doc.imagens = novasImagens;
        if (novosIds.length) doc.imagensPublicIds = Array.from(new Set([...(doc.imagensPublicIds || []), ...novosIds]));

        await doc.save();
      }

      migrated++;
      console.log(`✅ Migrado anúncio ${id}${DRY ? ' (dry-run)' : ''}`);
    } catch (e) {
      errors++;
      console.error('💥 Erro migrando anúncio:', e?.message || e);
    }
  }

  console.log(`\nResumo: migrated=${migrated}, skipped=${skipped}, errors=${errors}`);
  await mongoose.disconnect();
  process.exit(0);
})();
