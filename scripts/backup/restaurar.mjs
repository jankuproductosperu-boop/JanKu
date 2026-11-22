// Restaurar desde una copia (fase 26a, D-89). SIMULA por defecto.
//
//   node scripts/backup/restaurar.mjs backups/respaldo-<base>-<fecha>            → simulación
//   node scripts/backup/restaurar.mjs backups/respaldo-<base>-<fecha> --apply    → solo el dueño
//   ... --coleccion products        → solo esa colección
//
// Solo REPONE documentos cuyo _id ya no existe en la base. Nunca sobrescribe ni borra (N1-3):
// sirve para recuperar lo borrado por error, no para deshacer cambios.

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import { RAIZ, cargarUri, destino, mensajeSeguro, preguntar } from "../migrations/_runner.mjs";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const iCol = args.indexOf("--coleccion");
const soloColeccion = iCol >= 0 ? args[iCol + 1] : undefined;
const carpetaArg = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--coleccion");

let codigo = 0;
try {
  if (!carpetaArg) throw new Error("Indica la carpeta de la copia, por ejemplo backups/respaldo-janku-dev-2026-11-21T10-00-00");
  const carpeta = path.resolve(RAIZ, carpetaArg);
  const manifiesto = JSON.parse(await readFile(path.join(carpeta, "manifiesto.json"), "utf8"));

  const uri = cargarUri();
  const { host } = destino(uri);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;
  if (!db) throw new Error("No se obtuvo la base de datos tras conectar");
  const base = db.databaseName;

  console.log("Restaurar desde copia");
  console.log(`Copia: ${path.relative(RAIZ, carpeta)} (base ${manifiesto.base}, ${manifiesto.fecha})`);
  console.log(`Host:  ${host}`);
  console.log(`Base:  ${base}`);
  console.log(`Modo:  ${apply ? "APLICAR (solo repone lo que falta)" : "SIMULACIÓN"}\n`);
  if (manifiesto.base !== base) console.log(`OJO: la copia es de "${manifiesto.base}" y la base actual es "${base}".\n`);

  const { EJSON } = mongoose.mongo.BSON;
  const archivos = (await readdir(carpeta)).filter((f) => f.endsWith(".json") && f !== "manifiesto.json").sort();
  const plan = [];
  for (const archivo of archivos) {
    const nombre = archivo.slice(0, -".json".length);
    if (soloColeccion && nombre !== soloColeccion) continue;
    const docs = EJSON.parse(await readFile(path.join(carpeta, archivo), "utf8"), { relaxed: false });
    const ids = docs.map((d) => d._id);
    const existentes = new Set();
    // Por tandas para no armar una consulta enorme.
    for (let i = 0; i < ids.length; i += 500) {
      const tanda = await db.collection(nombre).find({ _id: { $in: ids.slice(i, i + 500) } }, { projection: { _id: 1 } }).toArray();
      for (const d of tanda) existentes.add(EJSON.stringify(d._id));
    }
    const faltan = docs.filter((d) => !existentes.has(EJSON.stringify(d._id)));
    plan.push({ nombre, faltan });
    console.log(`  ${nombre.padEnd(24)} en copia ${String(docs.length).padStart(6)} · por reponer ${String(faltan.length).padStart(6)}`);
  }

  const total = plan.reduce((s, p) => s + p.faltan.length, 0);
  console.log(`\nTotal por reponer: ${total}`);
  if (!apply) {
    console.log("SIMULACIÓN: no se escribió nada. Para reponer: --apply (solo el dueño).");
  } else if (total === 0) {
    console.log("Nada que reponer.");
  } else {
    const tecleado = await preguntar(`Escribe el nombre de la base (${base}) para continuar: `);
    if (tecleado !== base) {
      console.log("El nombre no coincide. Cancelado; no se escribió nada.");
    } else {
      for (const { nombre, faltan } of plan) {
        if (!faltan.length) continue;
        // ordered:false → si otro proceso ya repuso alguno (clave duplicada), sigue con el resto.
        try {
          const r = await db.collection(nombre).insertMany(faltan, { ordered: false });
          console.log(`  ${nombre}: repuestos ${r.insertedCount}`);
        } catch (e) {
          const n = e?.result?.insertedCount ?? e?.insertedCount ?? 0;
          console.log(`  ${nombre}: repuestos ${n} (algunos ya existían o fallaron)`);
        }
      }
    }
  }
} catch (err) {
  codigo = 1;
  console.error(`Error: ${mensajeSeguro(err)}`);
} finally {
  await mongoose.disconnect().catch(() => {});
  process.exit(codigo);
}
