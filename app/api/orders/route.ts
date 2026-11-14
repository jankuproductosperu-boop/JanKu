import { getOptionalUser } from "@/server/auth/guards";
import { obtenerIP } from "@/server/auth/ip";
import { registrarIntento } from "@/server/auth/rateLimit";
import { demasiadosIntentos } from "@/server/http/errors";
import { SECURITY_HEADERS, handle, json } from "@/server/http/respond";
import { crearPedido } from "@/server/services/order.service";
import { pedidoCrearSchema } from "@/server/validation/order.schema";

export const POST = handle(async (req) => {
  // El límite va antes de validar: cada petición cuenta, también las rechazadas.
  const ip = obtenerIP(req.headers);
  const limite = await registrarIntento("order", "ip", ip);
  if (!limite.permitido) throw demasiadosIntentos(limite.minutosRestantes);

  const datos = pedidoCrearSchema.parse(await req.json());
  const usuario = await getOptionalUser();
  const resultado = await crearPedido(datos, {
    userId: usuario?.id,
    ip,
    userAgent: req.headers.get("user-agent") ?? "",
  });
  return json(resultado, { status: 201, headers: SECURITY_HEADERS });
});
