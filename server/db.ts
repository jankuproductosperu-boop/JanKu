import "server-only";
// lib/mongodb.ts
import mongoose from "mongoose";
import { log } from "@/server/logger";

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

const cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

export async function connectDB() {
  // Si ya hay una conexión activa, usarla
  if (cached.conn) return cached.conn;

  // Si no hay una promesa de conexión, crearla
  if (!cached.promise) {
    const opts = {
      bufferCommands: true,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      log.info("mongodb.conectado");
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    log.error("mongodb.error_conexion", e);
    throw e;
  }

  return cached.conn;
}