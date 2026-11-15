import { requireAdmin } from "@/server/auth/guards";
import { handle, json } from "@/server/http/respond";
import {
  agregarNota,
  cancelarPedido,
  confirmarPedido,
  marcarEntregado,
  marcarEnviado,
  obtenerPedidoAdmin,
  registrarPago,
  sinCostos,
} from "@/server/services/order.service";
import { pedidoAccionSchema } from "@/server/validation/order.schema";

export const GET = handle(async (_req, ctx) => {
  const admin = await requireAdmin("pedidos.ver");
  const { id } = await ctx.params;
  return json(await obtenerPedidoAdmin(id, { incluirCostos: admin.permisos.includes("costos.ver") }));
});

export const PATCH = handle(async (req, ctx) => {
  const admin = await requireAdmin("pedidos.gestionar");
  const { id } = await ctx.params;
  const datos = pedidoAccionSchema.parse(await req.json());
  const actor = { adminId: admin.id };

  let pedido;
  switch (datos.accion) {
    case "confirmar":
      pedido = await confirmarPedido(id, actor);
      break;
    case "enviar":
      pedido = await marcarEnviado(id, actor, datos.nota);
      break;
    case "entregar":
      pedido = await marcarEntregado(id, actor);
      break;
    case "cancelar":
      pedido = await cancelarPedido(id, actor, datos.motivo);
      break;
    case "pago":
      pedido = await registrarPago(id, actor, { estado: datos.estado, metodo: datos.metodo, referencia: datos.referencia });
      break;
    case "nota":
      pedido = await agregarNota(id, actor, datos.nota);
      break;
  }
  // Los servicios devuelven el pedido con costos: sin `costos.ver` se quitan aquí.
  return json(admin.permisos.includes("costos.ver") ? pedido : sinCostos(pedido));
});
