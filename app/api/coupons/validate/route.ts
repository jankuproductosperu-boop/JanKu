import { getOptionalUser } from "@/server/auth/guards";
import { obtenerIP } from "@/server/auth/ip";
import { registrarIntento } from "@/server/auth/rateLimit";
import { demasiadosIntentos } from "@/server/http/errors";
import { SECURITY_HEADERS, handle, json } from "@/server/http/respond";
import { claveCliente, validarCupon } from "@/server/services/coupon.service";
import { resolverItems } from "@/server/services/order.service";
import { cuponValidarSchema } from "@/server/validation/coupon.schema";

// Público. SOLO LECTURA: no reserva ni consume el cupón (D-41, D-43).
// Siempre 200 con CouponValidateResult, también si el cupón no es válido. Si el CARRITO no es válido
// (producto inactivo, sin stock…), responde el mismo 400/409 que POST /api/orders (aprobado por el dueño).
export const POST = handle(async (req) => {
  // El límite va antes de validar: cada petición cuenta, también las rechazadas (10 / 10 min por IP).
  const ip = obtenerIP(req.headers);
  const limite = await registrarIntento("coupon", "ip", ip);
  if (!limite.permitido) throw demasiadosIntentos(limite.minutosRestantes);

  const datos = cuponValidarSchema.parse(await req.json());
  const usuario = await getOptionalUser();
  const { lineas } = await resolverItems(datos.items); // precios de la base (N1-5)
  const resultado = await validarCupon({
    codigo: datos.codigo,
    lineas,
    clienteKey: claveCliente({ userId: usuario?.id, telefono: datos.telefono }),
  });
  return json(resultado, { headers: SECURITY_HEADERS });
});
