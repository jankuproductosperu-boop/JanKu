import { getOptionalUser } from "@/server/auth/guards";
import { obtenerIP } from "@/server/auth/ip";
import { registrarIntento } from "@/server/auth/rateLimit";
import { comprobarTurnstile, separarTokenTurnstile } from "@/server/auth/turnstile";
import { demasiadosIntentos } from "@/server/http/errors";
import { SECURITY_HEADERS, handle, json } from "@/server/http/respond";
import { crearPedido } from "@/server/services/order.service";
import { pedidoCrearSchema } from "@/server/validation/order.schema";

export const POST = handle(async (req) => {
  // El límite va antes de validar: cada petición cuenta, también las rechazadas.
  const ip = obtenerIP(req.headers);
  const limite = await registrarIntento("order", "ip", ip);
  if (!limite.permitido) throw demasiadosIntentos(limite.minutosRestantes);

  // Fase 26c (D-93): turnstileToken es opcional (N1-6) y se saca antes del esquema estricto.
  const { token, cuerpo } = separarTokenTurnstile(await req.json());
  const datos = pedidoCrearSchema.parse(cuerpo);
  // Antes de tocar la base. Si Cloudflare no responde, el pedido sigue con el límite por IP (Q2).
  const fallo = await comprobarTurnstile(token, ip, { aceptarSiNoDisponible: true });
  if (fallo) throw fallo;
  const usuario = await getOptionalUser();
  const resultado = await crearPedido(datos, {
    userId: usuario?.id,
    ip,
    userAgent: req.headers.get("user-agent") ?? "",
  });
  return json(resultado, { status: 201, headers: SECURITY_HEADERS });
});
