// lib/mongodb.ts
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error("❌ Por favor define MONGODB_URI en tu archivo .env.local");
}

// Definir tipos correctos
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Variable global para mantener la conexión entre hot reloads
declare global {
  var mongoose: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

export async function connectDB() {
  // Si ya hay una conexión activa, usarla
  if (cached.conn) {
    console.log("✅ Usando conexión existente a MongoDB");
    return cached.conn;
  }

  // Si no hay una promesa de conexión, crearla
  if (!cached.promise) {
    const opts = {
      bufferCommands: true,
    };

    console.log("🔄 Conectando a MongoDB...");
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      console.log("✅ MongoDB conectado exitosamente");
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error("❌ Error al conectar MongoDB:", e);
    throw e;
  }

  return cached.conn;
}