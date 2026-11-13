// Ejecutor común de migraciones (docs/plan/02-datos.md §4.1).
//
//   node scripts/migrations/NNN-nombre.mjs                     → SIMULACIÓN (no escribe nada)
//   node scripts/migrations/NNN-nombre.mjs --apply             → escribe; pide teclear el nombre de la base
//   node scripts/migrations/NNN-nombre.mjs --apply --yes --db-name <base>
//
// --apply lo ejecuta SOLO el dueño. Nunca imprime la URI, usuarios ni contraseñas.
// Usa el driver nativo (mongoose.connection.db), sin importar los modelos TypeScript.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mongoose from "mongoose";

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Carga .env.local de la raíz del repo y devuelve MONGODB_URI (sin imprimirla). */
export function cargarUri() {
  dotenv.config({ path: path.join(RAIZ, ".env.local"), quiet: true });
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI no está definida en .env.local");
  return uri;
}

/** Host y nombre de base extraídos de la URI. Nunca usuario ni contraseña. */
export function destino(uri) {
  try {
    const url = new URL(uri);
    const base = decodeURIComponent(url.pathname.slice(1));
    return { host: url.hostname || "(desconocido)", base: base || "(no indicada: Mongo usará \"test\")" };
  } catch {
    // URI con varios hosts (mongodb://h1,h2,h3/base): new URL no la acepta.
    const m = /^mongodb(?:\+srv)?:\/\/(?:[^@/]*@)?([^/?]+)(?:\/([^?]*))?/.exec(uri);
    if (!m) return { host: "(no se pudo leer la URI)", base: "(no se pudo leer la URI)" };
    const base = decodeURIComponent(m[2] || "");
    return { host: m[1], base: base || "(no indicada: Mongo usará \"test\")" };
  }
}

/** Pregunta visible por consola. */
export function preguntar(texto) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(texto, (respuesta) => {
      rl.close();
      resolve(respuesta.trim());
    });
  });
}

/** Pregunta sin eco en pantalla (para contraseñas). */
export function preguntarOculto(texto) {
  const stdin = process.stdin;
  if (!stdin.isTTY) return preguntar(texto); // entrada redirigida: no hay eco que ocultar
  return new Promise((resolve) => {
    process.stdout.write(texto);
    let valor = "";
    const terminar = () => {
      stdin.off("data", alRecibir);
      stdin.setRawMode(false);
      stdin.pause();
      process.stdout.write("\n");
    };
    const alRecibir = (trozo) => {
      for (const ch of trozo) {
        if (ch === "\r" || ch === "\n") {
          terminar();
          resolve(valor);
          return;
        }
        if (ch === "\u0003") {
          terminar();
          process.exit(130); // Ctrl+C
        }
        if (ch === "\u007f" || ch === "\b") {
          valor = valor.slice(0, -1);
          continue;
        }
        if (ch < " ") continue;
        valor += ch;
      }
    };
    stdin.setEncoding("utf8");
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on("data", alRecibir);
  });
}

/** Mensaje de error sin la URI ni credenciales tipo usuario:clave@. */
export function mensajeSeguro(err) {
  let m = err instanceof Error ? err.message : String(err);
  const uri = process.env.MONGODB_URI;
  if (uri) m = m.split(uri).join("<MONGODB_URI>");
  return m.replace(/\/\/[^/\s@]*@/g, "//<credenciales>@");
}

function leerArgs(argv) {
  const i = argv.indexOf("--db-name");
  return {
    apply: argv.includes("--apply"),
    yes: argv.includes("--yes"),
    dbName: i >= 0 ? argv[i + 1] : undefined,
  };
}

function marcaDeTiempo() {
  return new Date().toISOString().replace(/:/g, "-").replace(/\..+$/, "");
}

/**
 * @param {object} o
 * @param {string} o.nombre              "001-admin-roles"
 * @param {string} o.descripcion
 * @param {string} o.coleccion           "adminusers"
 * @param {object} o.filtro              filtro Mongo de los documentos a cambiar
 * @param {(doc: object) => object | null} o.cambio   objeto para $set, o null para saltar
 * @param {string[]} [o.camposEjemplo]   campos del documento que se muestran en los ejemplos además de _id
 */
export async function ejecutarMigracion({ nombre, descripcion, coleccion, filtro, cambio, camposEjemplo = [] }) {
  const args = leerArgs(process.argv.slice(2));
  let codigo = 0;

  try {
    const uri = cargarUri();
    const { host, base } = destino(uri);

    console.log(`Migración: ${nombre}`);
    console.log(`  ${descripcion}`);
    console.log(`Host:      ${host}`);
    console.log(`Base:      ${base}`);
    console.log(`Colección: ${coleccion}`);
    console.log(`Modo:      ${args.apply ? "APLICAR" : "SIMULACIÓN"}`);
    console.log("");

    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    const db = mongoose.connection.db;
    if (!db) throw new Error("No se obtuvo la base de datos tras conectar");
    const baseReal = db.databaseName;
    if (baseReal !== base) console.log(`Base efectiva tras conectar: ${baseReal}\n`);

    const col = db.collection(coleccion);
    const docs = await col.find(filtro).toArray();

    const pendientes = [];
    for (const doc of docs) {
      const set = cambio(doc);
      if (set && Object.keys(set).length > 0) pendientes.push({ doc, set });
    }

    console.log(`Documentos revisados (coinciden con el filtro): ${docs.length}`);
    console.log(`Documentos por cambiar: ${pendientes.length}`);
    for (const { doc, set } of pendientes.slice(0, 5)) {
      const ejemplo = { _id: String(doc._id) };
      for (const c of camposEjemplo) ejemplo[c] = doc[c];
      console.log("  ·", JSON.stringify({ ...ejemplo, cambio: set }));
    }
    if (pendientes.length > 5) console.log(`  … y ${pendientes.length - 5} más`);
    console.log("");

    if (!args.apply) {
      console.log("SIMULACIÓN: no se escribió nada. Para aplicar: --apply (solo el dueño).");
      return;
    }

    if (pendientes.length === 0) {
      console.log("Nada que aplicar.");
      return;
    }

    // Confirmación: teclear el nombre de la base, o --yes con --db-name coincidente.
    if (args.yes) {
      if (args.dbName !== baseReal) {
        throw new Error("--yes requiere --db-name con el nombre exacto de la base. No se escribió nada.");
      }
    } else {
      const tecleado = await preguntar(`Escribe el nombre de la base (${baseReal}) para continuar: `);
      if (tecleado !== baseReal) {
        console.log("El nombre no coincide. Cancelado; no se escribió nada.");
        return;
      }
    }

    // Copia de seguridad de los documentos originales antes de escribir.
    const carpeta = path.join(RAIZ, "backups");
    await mkdir(carpeta, { recursive: true });
    const archivo = path.join(carpeta, `${marcaDeTiempo()}-${nombre}.json`);
    const { EJSON } = mongoose.mongo.BSON;
    await writeFile(
      archivo,
      EJSON.stringify(pendientes.map((p) => p.doc), undefined, 2, { relaxed: false }),
      "utf8",
    );
    console.log(`Copia guardada en ${path.relative(RAIZ, archivo)}`);

    // Se repite el filtro en cada update: si otro proceso ya lo cambió, no se toca (idempotente).
    let cambiados = 0;
    for (const { doc, set } of pendientes) {
      const r = await col.updateOne({ $and: [{ _id: doc._id }, filtro] }, { $set: set });
      cambiados += r.modifiedCount;
    }
    console.log(`Documentos cambiados: ${cambiados} de ${pendientes.length}`);
  } catch (err) {
    codigo = 1;
    console.error(`Error: ${mensajeSeguro(err)}`);
  } finally {
    await mongoose.disconnect().catch(() => {});
    process.exit(codigo);
  }
}
