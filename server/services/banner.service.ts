import "server-only";
import { connectDB } from "@/server/db";
import { noEncontrado } from "@/server/http/errors";
import Banner from "@/models/Banner";
import type { Banner as BannerTipo, BannerInput } from "@/types";

function plano<T>(doc: unknown): T {
  return JSON.parse(JSON.stringify(doc)) as T;
}

export async function listarBannersActivos(): Promise<BannerTipo[]> {
  await connectDB();
  const banners = await Banner.find({ activo: true }).lean();
  return plano<BannerTipo[]>(banners);
}

export async function listarBanners(): Promise<BannerTipo[]> {
  await connectDB();
  const banners = await Banner.find().lean();
  return plano<BannerTipo[]>(banners);
}

export async function obtenerBanner(id: string): Promise<BannerTipo> {
  await connectDB();
  const banner = await Banner.findById(id).lean();
  if (!banner) throw noEncontrado("Banner");
  return plano<BannerTipo>(banner);
}

export async function crearBanner(datos: Partial<BannerInput>): Promise<BannerTipo> {
  await connectDB();
  const banner = await Banner.create(datos);
  return plano<BannerTipo>(banner);
}

export async function actualizarBanner(id: string, datos: Partial<BannerInput>): Promise<BannerTipo> {
  await connectDB();
  const actualizado = await Banner.findByIdAndUpdate(id, datos, { new: true }).lean();
  if (!actualizado) throw noEncontrado("Banner");
  return plano<BannerTipo>(actualizado);
}

export async function eliminarBanner(id: string): Promise<void> {
  await connectDB();
  const eliminado = await Banner.findByIdAndDelete(id).lean();
  if (!eliminado) throw noEncontrado("Banner");
}
