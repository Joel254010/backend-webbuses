import 'dotenv/config';
import mongoose from 'mongoose';
import Anuncio from '../models/Anuncio.js';

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
await mongoose.connect(uri);
const faltam = await Anuncio.countDocuments({ $or: [{ fotoCapaPublicId: { $exists: false } }, { fotoCapaPublicId: null }] });
console.log('Faltam migrar:', faltam);
await mongoose.disconnect();
process.exit(0);
