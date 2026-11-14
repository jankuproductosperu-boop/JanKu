import "server-only";
import { connectDB } from "@/server/db";
import { popupVigente } from "@/lib/popup";
import Popup from "@/models/Popup";
import type { Popup as PopupTipo, PopupInput, PopupPublico } from "@/types";

const CLAVE = "principal";

function plano<T>(doc: unknown): T {
  return JSON.parse(JSON.stringify(doc)) as T;
}

export async function obtenerPopupAdmin(): Promise<PopupTipo | null> {
  await connectDB();
  const doc = await Popup.findOne({ clave: CLAVE }).lean();
  return doc ? plano<PopupTipo>(doc) : null;
}

export async function guardarPopup(datos: PopupInput): Promise<PopupTipo> {
  await connectDB();
  const doc = await Popup.findOneAndUpdate(
    { clave: CLAVE },
    { $set: datos, $setOnInsert: { clave: CLAVE } },
    { upsert: true, new: true, runValidators: true },
  ).lean();
  enCache = null; // el siguiente visitante ve el cambio al momento (en esta instancia)
  return plano<PopupTipo>(doc);
}

// La tienda lo pide en cada visita y cambia muy poco: se guarda la lectura 60 s en memoria.
// Las fechas se evalúan en cada petición, así que activar/caducar por fecha sigue siendo exacto.
const TTL_MS = 60_000;
let enCache: { valor: PopupTipo | null; hasta: number } | null = null;

async function leerPopupConCache(): Promise<PopupTipo | null> {
  const ahora = Date.now();
  if (enCache && enCache.hasta > ahora) return enCache.valor;
  const valor = await obtenerPopupAdmin();
  enCache = { valor, hasta: ahora + TTL_MS };
  return valor;
}

/** Solo devuelve algo si está activo y dentro de sus fechas; nunca datos internos. */
export async function obtenerPopupPublico(): Promise<PopupPublico | null> {
  const p = await leerPopupConCache();
  if (!p || !popupVigente(p)) return null;
  return { imagenUrl: p.imagenUrl, textoBoton: p.textoBoton, enlace: p.enlace, version: p.updatedAt ?? "" };
}
