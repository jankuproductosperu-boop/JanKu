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
  return plano<PopupTipo>(doc);
}

/** Solo devuelve algo si está activo y dentro de sus fechas; nunca datos internos. */
export async function obtenerPopupPublico(): Promise<PopupPublico | null> {
  const p = await obtenerPopupAdmin();
  if (!p || !popupVigente(p)) return null;
  return { imagenUrl: p.imagenUrl, textoBoton: p.textoBoton, enlace: p.enlace, version: p.updatedAt ?? "" };
}
