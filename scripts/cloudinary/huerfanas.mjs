// Imágenes huérfanas en Cloudinary (fase 28, D-95).
//
//   node scripts/cloudinary/huerfanas.mjs                     → solo informe: no cambia nada
//   node scripts/cloudinary/huerfanas.mjs --apply             → mueve las huérfanas a huerfanas/ (pide confirmar)
//   node scripts/cloudinary/huerfanas.mjs --deshacer backups/huerfanas-<fecha>.json   → las devuelve a su sitio
//
//   Opciones: --bases jankuDB,janku-dev   (si el usuario de Mongo no puede listar las bases del clúster)
//             --dias 30                    (solo cuentan las imágenes con más días que esto; por defecto 30)
//             --yes                        (no pregunta antes de mover o devolver)
//
// Llama a Cloudinary y lee la base DE VERDAD: SOLO lo ejecuta el dueño (N1-8). No escribe en la base (N1-3).
// Nunca borra: «mover» es renombrar el public_id a huerfanas/<public_id> y añadir la etiqueta «huerfana»;
// el borrado definitivo se hace a mano desde Cloudinary. Producción y desarrollo comparten la cuenta de
// Cloudinary, así que se leen TODAS las bases del clúster, además del código del repo: una imagen cuenta como
// usada si su public_id aparece en cualquier documento o archivo. Nunca toca estaticas/ ni lo ya movido.
// Credenciales de .env.local (MONGODB_URI, CLOUDINARY_*); nunca se imprimen (N1-2).

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import { RAIZ, cargarUri, destino, mensajeSeguro, preguntar } from "../migrations/_runner.mjs";

const CARPETA = "huerfanas/";
const ETIQUETA = "huerfana";
const PROTEGIDAS = ["estaticas/", CARPETA];
const SISTEMA = new Set(["admin", "local", "config"]);
const CODIGO = ["app", "Components", "context", "hooks", "lib", "server", "public", "scripts", "next.config.ts"];
const TEXTO = /\.(ts|tsx|js|mjs|cjs|json|css|html|md|txt|svg|webmanifest)$/i;

/** Formas en que un public_id puede aparecer escrito (tal cual o dentro de una URL codificada). */
export function formasDelId(publicId) {
  return [...new Set([publicId, encodeURI(publicId), publicId.split("/").map(encodeURIComponent).join("/")])];
}

/** Huérfana: fuera de las carpetas protegidas, más antigua que `limite` (ms) y sin aparecer en el corpus. */
export function esHuerfana(recurso, corpus, limite) {
  if (PROTEGIDAS.some((p) => recurso.public_id.startsWith(p))) return false;
  const creada = Date.parse(recurso.created_at);
  if (!Number.isFinite(creada) || creada > limite) return false;
  return !formasDelId(recurso.public_id).some((f) => corpus.includes(f));
}

function leerArgs(argv) {
  const valor = (n) => {
    const i = argv.indexOf(n);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const dias = Number(valor("--dias") ?? 30);
  return {
    apply: argv.includes("--apply"),
    yes: argv.includes("--yes"),
    deshacer: valor("--deshacer"),
    bases: valor("--bases")?.split(",").map((b) => b.trim()).filter(Boolean),
    dias: Number.isFinite(dias) && dias >= 0 ? dias : 30,
  };
}

const marca = () => new Date().toISOString().replace(/:/g, "-").replace(/\..+$/, "");
const kb = (b) => `${(b / 1024).toFixed(0)} KB`;

function configurarCloudinary() {
  const faltan = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"].filter((n) => !process.env[n]);
  if (faltan.length) throw new Error(`Faltan en .env.local: ${faltan.join(", ")}`);
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

async function confirmar(texto, palabra, yes) {
  if (yes) return true;
  return (await preguntar(`${texto} Escribe «${palabra}» para seguir: `)) === palabra;
}

/** Texto de todos los documentos de todas las bases del clúster (o de --bases). */
async function corpusDeLaBase(basesPedidas) {
  const cliente = mongoose.connection.getClient();
  let bases = basesPedidas;
  if (!bases) {
    try {
      const { databases } = await cliente.db("admin").admin().listDatabases({ nameOnly: true });
      bases = databases.map((d) => d.name).filter((n) => !SISTEMA.has(n));
    } catch {
      throw new Error("El usuario de Mongo no puede listar las bases: indica todas con --bases jankuDB,janku-dev");
    }
  }
  let corpus = "";
  let productos = 0;
  const resumen = {};
  for (const nombre of bases) {
    const db = cliente.db(nombre);
    const colecciones = (await db.listCollections({ type: "collection" }, { nameOnly: true }).toArray())
      .map((c) => c.name)
      .filter((n) => !n.startsWith("system."));
    let docs = 0;
    for (const c of colecciones) {
      for await (const doc of db.collection(c).find({})) {
        corpus += `${JSON.stringify(doc)}\n`;
        docs++;
        if (c === "products") productos++;
      }
    }
    resumen[nombre] = docs;
    console.log(`  ${nombre.padEnd(20)} ${String(colecciones.length).padStart(3)} colecciones ${String(docs).padStart(7)} documentos`);
  }
  // Si no hay productos, casi seguro que se leyó una base equivocada: mejor no decidir nada.
  if (productos === 0) throw new Error("Ninguna de las bases leídas tiene productos: revisa MONGODB_URI o --bases");
  return { corpus, resumen };
}

/** Texto de los archivos del repo que pueden tener URL de Cloudinary escritas a mano. */
async function corpusDelCodigo() {
  let corpus = "";
  let archivos = 0;
  const recorrer = async (ruta) => {
    const info = await readdir(ruta, { withFileTypes: true }).catch(() => null);
    if (!info) {
      if (TEXTO.test(ruta)) {
        corpus += await readFile(ruta, "utf8").catch(() => "");
        archivos++;
      }
      return;
    }
    for (const e of info) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      const p = path.join(ruta, e.name);
      if (e.isDirectory()) await recorrer(p);
      else if (TEXTO.test(e.name)) {
        corpus += await readFile(p, "utf8").catch(() => "");
        archivos++;
      }
    }
  };
  for (const c of CODIGO) await recorrer(path.join(RAIZ, c));
  console.log(`  código del repo: ${archivos} archivos`);
  return corpus;
}

async function listarImagenes() {
  const todas = [];
  let cursor;
  do {
    const r = await cloudinary.api.resources({ type: "upload", resource_type: "image", max_results: 500, next_cursor: cursor });
    todas.push(...r.resources);
    cursor = r.next_cursor;
  } while (cursor);
  return todas;
}

async function deshacer(archivo, yes) {
  const informe = JSON.parse(await readFile(path.resolve(RAIZ, archivo), "utf8"));
  const movidas = informe.movidas ?? [];
  if (!movidas.length) {
    console.log("Ese informe no tiene imágenes movidas.");
    return;
  }
  console.log(`Se devolverán ${movidas.length} imágenes a su public_id original.`);
  if (!(await confirmar("", "devolver", yes))) {
    console.log("Cancelado: no se cambió nada.");
    return;
  }
  let ok = 0;
  for (const m of movidas) {
    try {
      await cloudinary.uploader.rename(m.hacia, m.desde, { overwrite: false, invalidate: true });
      await cloudinary.uploader.remove_tag(ETIQUETA, [m.desde]);
      ok++;
    } catch (err) {
      console.error(`  no se pudo devolver ${m.hacia}: ${mensajeSeguro(err)}`);
    }
  }
  console.log(`Devueltas ${ok} de ${movidas.length}.`);
}

async function principal() {
  const args = leerArgs(process.argv);
  const uri = cargarUri(); // también carga CLOUDINARY_* de .env.local
  configurarCloudinary();
  if (args.deshacer) return deshacer(args.deshacer, args.yes);

  console.log(args.apply ? "Imágenes huérfanas: MOVER a huerfanas/" : "Imágenes huérfanas: SOLO INFORME (no cambia nada)");
  console.log(`Host de Mongo: ${destino(uri).host}`);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  const { corpus: deBase, resumen } = await corpusDeLaBase(args.bases);
  const corpus = deBase + (await corpusDelCodigo());

  const imagenes = await listarImagenes();
  const limite = Date.now() - args.dias * 24 * 60 * 60 * 1000;
  const huerfanas = imagenes.filter((r) => esHuerfana(r, corpus, limite));
  const protegidas = imagenes.filter((r) => PROTEGIDAS.some((p) => r.public_id.startsWith(p))).length;
  const bytes = huerfanas.reduce((s, r) => s + (r.bytes ?? 0), 0);

  console.log(`\nCloudinary: ${imagenes.length} imágenes · ${protegidas} protegidas (estaticas/, huerfanas/)`);
  console.log(`Huérfanas con más de ${args.dias} días: ${huerfanas.length} (${kb(bytes)})`);
  for (const r of huerfanas.slice(0, 20)) console.log(`  ${r.public_id}  ${kb(r.bytes ?? 0)}  ${r.created_at?.slice(0, 10)}`);
  if (huerfanas.length > 20) console.log(`  … y ${huerfanas.length - 20} más (ver el informe)`);

  const informe = {
    fecha: new Date().toISOString(),
    modo: args.apply ? "mover" : "informe",
    dias: args.dias,
    bases: resumen,
    imagenes: imagenes.length,
    protegidas,
    bytesHuerfanas: bytes,
    huerfanas: huerfanas.map((r) => ({ public_id: r.public_id, bytes: r.bytes, creada: r.created_at, url: r.secure_url })),
    movidas: [],
    fallos: [],
  };
  const carpeta = path.join(RAIZ, "backups");
  await mkdir(carpeta, { recursive: true });
  const archivo = path.join(carpeta, `huerfanas-${marca()}.json`);
  const guardar = () => writeFile(archivo, JSON.stringify(informe, null, 2), "utf8");
  await guardar();
  console.log(`\nInforme: ${path.relative(RAIZ, archivo)}`);

  if (!args.apply) {
    console.log("SOLO INFORME: no se movió nada. Para mover: --apply (solo el dueño).");
    return;
  }
  if (!huerfanas.length) return;
  if (!(await confirmar(`Se moverán ${huerfanas.length} imágenes a ${CARPETA} (sin borrar).`, "mover", args.yes))) {
    console.log("Cancelado: no se movió nada.");
    return;
  }
  for (const r of huerfanas) {
    const hacia = CARPETA + r.public_id;
    try {
      await cloudinary.uploader.rename(r.public_id, hacia, { overwrite: false, invalidate: true });
      await cloudinary.uploader.add_tag(ETIQUETA, [hacia]);
      informe.movidas.push({ desde: r.public_id, hacia });
    } catch (err) {
      informe.fallos.push({ public_id: r.public_id, error: mensajeSeguro(err) });
    }
  }
  await guardar();
  console.log(`Movidas ${informe.movidas.length}; fallos ${informe.fallos.length}. Para devolverlas: --deshacer ${path.relative(RAIZ, archivo)}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  let codigo = 0;
  try {
    await principal();
  } catch (err) {
    codigo = 1;
    console.error(`Error: ${mensajeSeguro(err)}`);
  } finally {
    await mongoose.disconnect().catch(() => {});
    process.exit(codigo);
  }
}
