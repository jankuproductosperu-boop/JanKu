// Genera los mapas de Estadísticas (fase 23d, D-94): mundo.json, peru.json y lima.json en
// app/(admin)/admin/estadisticas/_mapas/. Se ejecuta a mano, una vez; el resultado se sube a git.
//
// Fuente: Natural Earth (dominio público), versión 5.1.1. Descargar y descomprimir FUERA del repo:
//   https://naciscdn.org/naturalearth/110m/cultural/ne_110m_admin_0_countries.zip
//   https://naciscdn.org/naturalearth/10m/cultural/ne_10m_admin_1_states_provinces.zip
//
// Uso:  node scripts/mapas/generar-mapas.mjs <carpeta con los .shp descomprimidos>
//
// Simplifica, proyecta y calcula un punto interior de cada forma con `npx mapshaper` (versión fija,
// sin instalarla); luego escribe un JSON compacto { ancho, alto, huancayo, formas: [{ id, nombre, d, x, y }] }
// con el trazo SVG ya listo (coordenadas enteras, relativas) y el punto del marcador. `huancayo` es null
// si la ciudad cae fuera del encuadre (el mapa de Lima).
// No toca la base ni llama a ningún servicio salvo npm. Falla si un mapa pasa su presupuesto de peso.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const MAPSHAPER = "mapshaper@0.6.113";
const DESTINO = fileURLToPath(new URL("../../app/(admin)/admin/estadisticas/_mapas/", import.meta.url));
const HUANCAYO = [-75.2049, -12.0651]; // lon, lat
const MARGEN = 24; // unidades del viewBox alrededor del mapa, para que los marcadores no se corten

/** Natural Earth da PE-LIM a las dos Limas; la provincia de Lima es Lima Metropolitana (PE-LMA). */
function departamento(p) {
  if (p.name === "Lima Province") return { id: "PE-LMA", nombre: "Lima Metropolitana" };
  if (p.iso_3166_2 === "PE-LIM") return { id: "PE-LIM", nombre: "Lima Provincias" };
  return { id: p.iso_3166_2, nombre: p.name };
}
const ZONA_LIMA = new Set(["PE-LMA", "PE-CAL", "PE-LIM"]);

const MAPAS = {
  mundo: {
    archivo: "ne_110m_admin_0_countries.shp",
    // Sin la Antártida. ISO_A2_EH corrige Francia y Noruega (ISO_A2 = -99).
    filtro: "ISO_A2_EH!='AQ'",
    campos: "ISO_A2_EH,NAME_ES",
    proyeccion: ["+proj=robin"],
    simplificar: "interval=12000", // metros; 1 unidad del mapa ≈ 34 km
    ladoMayor: 1000,
    presupuesto: 120 * 1024,
    forma: (p) => ({ id: /^[A-Z]{2}$/.test(p.ISO_A2_EH) ? p.ISO_A2_EH : "", nombre: p.NAME_ES ?? "" }),
  },
  peru: {
    archivo: "ne_10m_admin_1_states_provinces.shp",
    filtro: "iso_a2=='PE'",
    campos: "name,iso_3166_2,type",
    proyeccion: ["merc"],
    simplificar: "interval=900", // metros; 1 unidad del mapa ≈ 2 km
    ladoMayor: 1000,
    presupuesto: 60 * 1024,
    forma: departamento,
  },
  lima: {
    // Zoom de Lima Metropolitana con el Callao y parte de Lima Provincias (unos 140 × 140 km).
    archivo: "ne_10m_admin_1_states_provinces.shp",
    filtro: "iso_a2=='PE'",
    campos: "name,iso_3166_2,type",
    recorte: "bbox=-77.4,-12.65,-76.1,-11.4", // lon/lat: oeste, sur, este, norte
    proyeccion: ["merc"],
    simplificar: "interval=150", // metros; 1 unidad del mapa ≈ 0,15 km
    ladoMayor: 1000,
    presupuesto: 30 * 1024,
    forma: departamento,
    // Los bordes de Junín u otros vecinos que entren en el recorte no se dibujan.
    conservar: (s) => ZONA_LIMA.has(s.id),
  },
};

function fallar(mensaje) {
  console.error(`✗ ${mensaje}`);
  process.exit(1);
}

function buscar(carpeta, nombre) {
  for (const e of fs.readdirSync(carpeta, { withFileTypes: true })) {
    const p = path.join(carpeta, e.name);
    if (e.isDirectory()) {
      const r = buscar(p, nombre);
      if (r) return r;
    } else if (e.name === nombre) return p;
  }
  return null;
}

/** En Windows npx es un .cmd y necesita shell: se citan las rutas con espacios. Los argumentos propios no llevan espacios. */
const enShell = process.platform === "win32";
const argumento = (a) => (enShell && /\s/.test(a) ? `"${a}"` : a);

function mapshaper(args) {
  const todos = ["-y", MAPSHAPER, ...args];
  const stdio = ["ignore", "inherit", "inherit"];
  const r = enShell
    ? spawnSync(["npx", ...todos].map(argumento).join(" "), { shell: true, stdio })
    : spawnSync("npx", todos, { stdio });
  if (r.status !== 0) fallar(`mapshaper terminó con código ${r.status}`);
}

const leer = (archivo) => JSON.parse(fs.readFileSync(archivo, "utf8"));

/** Número compacto: el signo menos hace de separador. */
function unir(nums) {
  let s = "";
  for (const n of nums) s += s && n >= 0 ? ` ${n}` : `${n}`;
  return s;
}

function anillos(geometria) {
  if (!geometria) return [];
  if (geometria.type === "Polygon") return geometria.coordinates;
  if (geometria.type === "MultiPolygon") return geometria.coordinates.flat();
  return [];
}

function generar(nombre, cfg, carpeta, tmp) {
  const shp = buscar(carpeta, cfg.archivo);
  if (!shp) fallar(`No encuentro ${cfg.archivo} en ${carpeta}`);
  const formas = path.join(tmp, `${nombre}-formas.json`);
  const puntos = path.join(tmp, `${nombre}-puntos.json`);
  const origen = path.join(tmp, `${nombre}-huancayo.json`);
  const huancayo = path.join(tmp, "huancayo.json");
  fs.writeFileSync(huancayo, JSON.stringify({ type: "Point", coordinates: HUANCAYO }));

  mapshaper([
    "-i", shp,
    "-filter", cfg.filtro,
    "-filter-fields", cfg.campos,
    ...(cfg.recorte ? ["-clip", cfg.recorte] : []),
    "-proj", ...cfg.proyeccion,
    "-simplify", cfg.simplificar, "keep-shapes",
    "-o", formas, "format=geojson",
    "-points", "inner",
    "-o", puntos, "format=geojson",
  ]);
  mapshaper(["-i", huancayo, "-proj", "from=wgs84", ...cfg.proyeccion, "-o", origen, "format=geojson"]);

  const todasFormas = leer(formas).features;
  const todosPuntos = leer(puntos).features;
  const hc = leer(origen);
  const hcGeom = hc.type === "FeatureCollection" ? hc.features[0].geometry : hc.type === "Feature" ? hc.geometry : hc.geometries?.[0] ?? hc;
  if (todasFormas.length !== todosPuntos.length) fallar(`${nombre}: ${todasFormas.length} formas y ${todosPuntos.length} puntos`);
  // Formas y puntos van en el mismo orden: se filtran juntos.
  const quedan = todasFormas.map((f, i) => i).filter((i) => !cfg.conservar || cfg.conservar(cfg.forma(todasFormas[i].properties ?? {})));
  const fc = quedan.map((i) => todasFormas[i]);
  const pc = quedan.map((i) => todosPuntos[i]);
  if (!fc.length) fallar(`${nombre}: no quedó ninguna forma`);

  // Límites en coordenadas proyectadas (y hacia arriba).
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const f of fc) for (const anillo of anillos(f.geometry)) for (const [x, y] of anillo) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const escala = (cfg.ladoMayor - 2 * MARGEN) / Math.max(maxX - minX, maxY - minY);
  const ancho = Math.round((maxX - minX) * escala + 2 * MARGEN);
  const alto = Math.round((maxY - minY) * escala + 2 * MARGEN);
  const px = (x) => Math.round((x - minX) * escala + MARGEN);
  const py = (y) => Math.round((maxY - y) * escala + MARGEN);

  let vertices = 0;
  const salida = fc.map((f, i) => {
    let d = "";
    for (const anillo of anillos(f.geometry)) {
      const pts = [];
      for (const [x, y] of anillo) {
        const p = [px(x), py(y)];
        const u = pts[pts.length - 1];
        if (!u || u[0] !== p[0] || u[1] !== p[1]) pts.push(p);
      }
      if (pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts.pop();
      if (pts.length < 3) continue;
      vertices += pts.length;
      const rel = [];
      for (let k = 1; k < pts.length; k++) rel.push(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
      d += `M${unir(pts[0])}l${unir(rel)}z`;
    }
    const punto = pc[i].geometry?.coordinates;
    const { id, nombre: n } = cfg.forma(f.properties ?? {});
    if (!d) fallar(`${nombre}: la forma ${id || n} se quedó sin trazo`);
    if (!punto) fallar(`${nombre}: la forma ${id || n} no tiene punto interior`);
    return { id, nombre: n, d, x: px(punto[0]), y: py(punto[1]) };
  });

  const ids = salida.map((s) => s.id).filter(Boolean);
  if (new Set(ids).size !== ids.length) fallar(`${nombre}: hay ids repetidos`);

  const hx = px(hcGeom.coordinates[0]);
  const hy = py(hcGeom.coordinates[1]);
  const dentro = hx >= 0 && hx <= ancho && hy >= 0 && hy <= alto;
  const datos = { ancho, alto, huancayo: dentro ? [hx, hy] : null, formas: salida };
  const texto = JSON.stringify(datos);
  const bytes = Buffer.byteLength(texto);
  const gz = zlib.gzipSync(texto, { level: 9 }).length;
  console.log(`${nombre}.json: ${salida.length} formas, ${vertices} vértices, ${ancho}×${alto}, ${bytes} B (${gz} B comprimido)`);
  if (bytes > cfg.presupuesto) fallar(`${nombre}.json pasa su presupuesto de ${cfg.presupuesto} B`);
  return texto;
}

const carpeta = process.argv[2];
if (!carpeta || !fs.existsSync(carpeta)) fallar("Uso: node scripts/mapas/generar-mapas.mjs <carpeta con los .shp descomprimidos>");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "janku-mapas-"));
try {
  const textos = Object.fromEntries(Object.entries(MAPAS).map(([n, cfg]) => [n, generar(n, cfg, path.resolve(carpeta), tmp)]));
  fs.mkdirSync(DESTINO, { recursive: true });
  for (const [n, texto] of Object.entries(textos)) fs.writeFileSync(path.join(DESTINO, `${n}.json`), `${texto}\n`);
  console.log(`✓ Escritos en ${path.relative(process.cwd(), DESTINO) || DESTINO}`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
