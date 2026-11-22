// Copia de seguridad de la base (fase 26a, D-89). SOLO LEE.
//
//   node scripts/backup/respaldar.mjs
//
// Guarda backups/respaldo-<base>-<fecha>/<colección>.json (EJSON canónico: conserva ObjectId y fechas)
// y manifiesto.json con el número de documentos de cada colección. Usa la MONGODB_URI de .env.local
// y nunca la imprime. La copia tiene datos personales y hashes: guárdala en un lugar privado.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import { RAIZ, cargarUri, destino, mensajeSeguro } from "../migrations/_runner.mjs";

const marca = () => new Date().toISOString().replace(/:/g, "-").replace(/\..+$/, "");

let codigo = 0;
try {
  const uri = cargarUri();
  const { host } = destino(uri);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;
  if (!db) throw new Error("No se obtuvo la base de datos tras conectar");

  const base = db.databaseName;
  console.log("Copia de seguridad (solo lectura)");
  console.log(`Host: ${host}`);
  console.log(`Base: ${base}\n`);

  const carpeta = path.join(RAIZ, "backups", `respaldo-${base}-${marca()}`);
  await mkdir(carpeta, { recursive: true });
  const { EJSON } = mongoose.mongo.BSON;

  // Solo colecciones normales (no vistas ni system.*), en orden alfabético.
  const colecciones = (await db.listCollections({ type: "collection" }, { nameOnly: true }).toArray())
    .map((c) => c.name)
    .filter((n) => !n.startsWith("system."))
    .sort();

  const manifiesto = { base, fecha: new Date().toISOString(), colecciones: {} };
  let total = 0;
  for (const nombre of colecciones) {
    const docs = await db.collection(nombre).find({}).toArray();
    await writeFile(path.join(carpeta, `${nombre}.json`), EJSON.stringify(docs, undefined, 0, { relaxed: false }), "utf8");
    manifiesto.colecciones[nombre] = docs.length;
    total += docs.length;
    console.log(`  ${nombre.padEnd(24)} ${String(docs.length).padStart(6)} documentos`);
  }
  await writeFile(path.join(carpeta, "manifiesto.json"), JSON.stringify(manifiesto, null, 2), "utf8");

  console.log(`\n${colecciones.length} colecciones, ${total} documentos.`);
  console.log(`Guardado en ${path.relative(RAIZ, carpeta)}`);
  console.log("Contiene datos personales: guárdala en un lugar privado.");
} catch (err) {
  codigo = 1;
  console.error(`Error: ${mensajeSeguro(err)}`);
} finally {
  await mongoose.disconnect().catch(() => {});
  process.exit(codigo);
}
