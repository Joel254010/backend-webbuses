// config/db.js
import mongoose from 'mongoose';

const conectarMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado ao MongoDB Atlas');
  } catch (erro) {
    console.error('❌ Erro ao conectar ao MongoDB:', erro.message);
    process.exit(1); // encerra se der erro
  }
};

export default conectarMongoDB;
