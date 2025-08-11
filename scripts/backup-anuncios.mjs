// scripts/backup-anuncios.mjs
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import Anuncio from '../models/Anuncio.js';

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!uri) {
  console.error('Falta MONGODB_URI no .env');
  process.exit(1);
}

const outDir = path.join(process.cwd(), 'backup');
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  const docs = await Anuncio.find({}).lean();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(outDir, `Anuncio_${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(docs, null, 2), 'utf8');
  console.log(`✅ Backup de ${docs.length} anúncios salvo em: ${file}`);
  await mongoose.disconnect();
  process.exit(0);
})();
