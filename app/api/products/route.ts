import { handle, json } from "@/server/http/respond";
import { exigirPermisosDeCampos, requireAdmin } from "@/server/auth/guards";
import { productoCrearSchema, productosQuerySchema } from "@/server/validation/product.schema";
import {
  crearProducto,
  listarProductosPublicos,
  listarProductosPublicosFiltrados,
} from "@/server/services/product.service";

// Fase 24: filtros opcionales (?ids=, ?categoria=, ?home=1, ?relacionados=) para que cada página pida
// solo lo que usa. Sin filtros, la respuesta es exactamente la de antes (arreglo completo).
export const GET = handle(async (req) => {
  const q = productosQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  if (q.ids) return json(await listarProductosPublicosFiltrados({ tipo: "ids", ids: q.ids }));
  if (q.relacionados) return json(await listarProductosPublicosFiltrados({ tipo: "relacionados", id: q.relacionados }));
  if (q.categoria) return json(await listarProductosPublicosFiltrados({ tipo: "categoria", slug: q.categoria }));
  if (q.home) return json(await listarProductosPublicosFiltrados({ tipo: "home" }));
  return json(await listarProductosPublicos());
});

export const POST = handle(async (req) => {
  const admin = await requireAdmin("catalogo.editar");
  const datos = productoCrearSchema.parse(await req.json());
  exigirPermisosDeCampos(admin, datos);
  return json(await crearProducto(datos, { adminId: admin.id }));
});
