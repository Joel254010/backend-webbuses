import mongoose from 'mongoose';

const conectarMongoDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error('❌ Variável MONGO_URI não definida no arquivo .env');
    process.exit(1);
  }

  try {
    const conexao = await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const nomeDB = conexao.connection.name || '(desconhecido)';
    console.log(`✅ Conectado ao MongoDB Atlas | Banco: ${nomeDB}`);
  } catch (erro) {
    console.error('❌ Erro ao conectar ao MongoDB:', erro.message);
    process.exit(1); // encerra a aplicação
  }
};

export default conectarMongoDB;
