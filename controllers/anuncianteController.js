import Anunciante from '../models/Anunciante.js';

// ✅ Função de cadastro (já existia)
export const cadastrarAnunciante = async (req, res) => {
  try {
    const novo = new Anunciante(req.body);
    await novo.save();

    res.status(201).json({
      mensagem: "Anunciante cadastrado com sucesso!",
      anunciante: novo
    });
  } catch (erro) {
    console.error("❌ Erro ao cadastrar anunciante:", erro);
    res.status(500).json({ mensagem: "Erro ao salvar anunciante no banco de dados." });
  }
};

// ✅ NOVA FUNÇÃO DE LOGIN
export const loginAnunciante = async (req, res) => {
  const { email, senha } = req.body;

  try {
    const anunciante = await Anunciante.findOne({ email });

    if (!anunciante || anunciante.senha !== senha) {
      return res.status(401).json({ mensagem: 'E-mail ou senha incorretos' });
    }

    // 🔐 Envia dados essenciais
    res.json({
      nome: anunciante.nome,
      email: anunciante.email,
      telefone: anunciante.telefone,
      documento: anunciante.documento,
      endereco: anunciante.endereco,
      localizacao: anunciante.localizacao,
      token: "simulado123"
    });
  } catch (erro) {
    console.error("❌ Erro no login do anunciante:", erro);
    res.status(500).json({ mensagem: 'Erro ao realizar login' });
  }
};
