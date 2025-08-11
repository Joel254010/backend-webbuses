import Anuncio from "../models/Anuncio.js";

// Criar anúncio
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
      kilometragem,
      lugares,
      cor,
      anoModelo,
      localizacao,
      valor,
      descricao,
      tipoModelo,
      fotoCapaUrl,
      imagens,
      status,
      dataEnvio
    } = req.body;

    // 🔍 Se não veio capa, mas veio imagens, pega a primeira como capa
    let capaFinal = fotoCapaUrl;
    if (!capaFinal && imagens && imagens.length > 0) {
      capaFinal = imagens[0];
    }

    if (!capaFinal) {
      return res.status(400).json({ mensagem: "Foto de capa é obrigatória." });
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
      kilometragem,
      lugares,
      cor,
      anoModelo,
      localizacao,
      valor,
      descricao,
      tipoModelo,
      fotoCapaUrl: capaFinal, // ✅ sempre salvar a capa
      imagens: imagens || [],
      status: status || "pendente",
      dataEnvio: dataEnvio || new Date()
    });

    await novoAnuncio.save();
    res.status(201).json(novoAnuncio);
  } catch (erro) {
    console.error("Erro ao criar anúncio:", erro);
    res.status(500).json({ mensagem: "Erro ao criar anúncio" });
  }
};

// Listar anúncios (somente capa e dados básicos para evitar lentidão)
export const listarAnuncios = async (req, res) => {
  try {
    const anuncios = await Anuncio.find({}, {
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
      fotoCapaUrl: 1, // ✅ sempre trazer a capa
      dataEnvio: 1,
      localizacao: 1
    }).sort({ dataEnvio: -1 });

    res.json(anuncios);
  } catch (erro) {
    console.error("Erro ao listar anúncios:", erro);
    res.status(500).json({ mensagem: "Erro ao listar anúncios" });
  }
};

// Buscar anúncio por ID
export const buscarAnuncioPorId = async (req, res) => {
  try {
    const anuncio = await Anuncio.findById(req.params.id);
    if (!anuncio) {
      return res.status(404).json({ mensagem: "Anúncio não encontrado" });
    }
    res.json(anuncio);
  } catch (erro) {
    console.error("Erro ao buscar anúncio:", erro);
    res.status(500).json({ mensagem: "Erro ao buscar anúncio" });
  }
};

// Atualizar status
export const atualizarStatusAnuncio = async (req, res) => {
  try {
    const { status } = req.body;
    const anuncio = await Anuncio.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!anuncio) {
      return res.status(404).json({ mensagem: "Anúncio não encontrado" });
    }
    res.json(anuncio);
  } catch (erro) {
    console.error("Erro ao atualizar status:", erro);
    res.status(500).json({ mensagem: "Erro ao atualizar status" });
  }
};

// Excluir anúncio
export const excluirAnuncio = async (req, res) => {
  try {
    const anuncio = await Anuncio.findByIdAndDelete(req.params.id);
    if (!anuncio) {
      return res.status(404).json({ mensagem: "Anúncio não encontrado" });
    }
    res.json({ mensagem: "Anúncio excluído com sucesso" });
  } catch (erro) {
    console.error("Erro ao excluir anúncio:", erro);
    res.status(500).json({ mensagem: "Erro ao excluir anúncio" });
  }
};
