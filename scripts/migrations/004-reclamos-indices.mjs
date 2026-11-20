// Migración 004 · fase 22b. Crea los índices del Libro de Reclamaciones (solo createIndex; NUNCA dropIndex ni syncIndexes).
//   node scripts/migrations/004-reclamos-indices.mjs            → simula (solo lee los índices existentes)
//   node scripts/migrations/004-reclamos-indices.mjs --apply    → crea los que falten (solo el dueño)
//
// No modifica documentos, así que no hace copia en backups/. Es idempotente: createIndex con la misma
// definición no hace nada. Las opciones deben coincidir con las de los modelos (mismo nombre automático).

import mongoose from "mongoose";
import { cargarUri, destino, mensajeSeguro, preguntar } from "./_runner.mjs";

const INDICES = [
  // Fase 22b (02-datos.md §3.6). `codigo` también es único en el modelo.
  { coleccion: "complaints", key: { codigo: 1 }, opciones: { unique: true } },
  { coleccion: "complaints", key: { estado: 1, fechaLimite: 1 }, opciones: {} },
  { coleccion: "complaints", key: { createdAt: -1 }, opciones: {} },
];

const firma = (key) => JSON.stringify(Object.entries(key));
const apply = process.argv.includes("--apply");
const yes = process.argv.includes("--yes");
const iDb = process.argv.indexOf("--db-name");
const dbName = iDb >= 0 ? process.argv[iDb + 1] : undefined;

let codigo = 0;
try {
  const uri = cargarUri();
  const { host, base } = destino(uri);
  console.log("Migración: 004-reclamos-indices");
  console.log("  Crea los índices de complaints (Libro de Reclamaciones). counters solo usa _id.");
  console.log(`Host:      ${host}`);
  console.log(`Base:      ${base}`);
  console.log(`Modo:      ${apply ? "APLICAR" : "SIMULACIÓN"}\n`);

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;
  if (!db) throw new Error("No se obtuvo la base de datos tras conectar");

  const faltantes = [];
  for (const idx of INDICES) {
    let existentes = [];
    try {
      existentes = await db.collection(idx.coleccion).indexes();
    } catch (err) {
      if (err?.codeName !== "NamespaceNotFound" && err?.code !== 26) throw err; // la colección aún no existe
    }
    const ya = existentes.some((e) => firma(e.key) === firma(idx.key));
    console.log(`${ya ? "existe " : "FALTA  "} ${idx.coleccion}  ${JSON.stringify(idx.key)}${idx.opciones.unique ? " único" : ""}`);
    if (!ya) faltantes.push(idx);
  }
  console.log(`\nÍndices por crear: ${faltantes.length}\n`);

  if (!apply) {
    console.log("SIMULACIÓN: no se escribió nada. Para aplicar: --apply (solo el dueño).");
  } else if (faltantes.length === 0) {
    console.log("Nada que aplicar.");
  } else {
    if (yes) {
      if (dbName !== db.databaseName) throw new Error("--yes requiere --db-name con el nombre exacto de la base. No se creó nada.");
    } else {
      const tecleado = await preguntar(`Escribe el nombre de la base (${db.databaseName}) para continuar: `);
      if (tecleado !== db.databaseName) {
        console.log("El nombre no coincide. Cancelado; no se creó nada.");
        process.exit(0);
      }
    }
    for (const idx of faltantes) {
      await db.collection(idx.coleccion).createIndex(idx.key, idx.opciones);
      console.log(`creado ${idx.coleccion}  ${JSON.stringify(idx.key)}`);
    }
  }
} catch (err) {
  codigo = 1;
  console.error(`Error: ${mensajeSeguro(err)}`);
} finally {
  await mongoose.disconnect().catch(() => {});
  process.exit(codigo);
}
