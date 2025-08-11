// config/db.js
import mongoose from "mongoose";
import "dotenv/config"; // garante .env carregado mesmo se o server.js ainda não rodou dotenv

let isConnected = false;

export default async function conectarMongoDB() {
  // lê no runtime (depois do dotenv)
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    throw new Error("Falta a variável de ambiente MONGODB_URI");
  }

  const autoIndex = process.env.MONGODB_AUTOINDEX === "true";
  mongoose.set("autoIndex", autoIndex);
  mongoose.set("strictQuery", true);

  if (isConnected) return mongoose.connection;

  const start = Date.now();
  await mongoose.connect(uri, {
    maxPoolSize: 20,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 8000,
    retryWrites: true,
    w: "majority",
  });

  isConnected = true;
  const ms = Date.now() - start;
  console.log(`✅ MongoDB conectado (${mongoose.connection.name}) em ${ms}ms`);

  mongoose.connection.on("error", (err) => {
    console.error("💥 MongoDB error:", err?.message || err);
  });
  mongoose.connection.on("disconnected", () => {
    isConnected = false;
    console.warn("⚠️ MongoDB desconectado");
  });

  return mongoose.connection;
}
