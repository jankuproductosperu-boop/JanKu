import { obtenerIP } from "@/server/auth/ip";
import { registrarIntento } from "@/server/auth/rateLimit";
import { demasiadosIntentos } from "@/server/http/errors";
import { SECURITY_HEADERS, handle, json } from "@/server/http/respond";
import { crearReclamo } from "@/server/services/complaint.service";
import { reclamoCrearSchema } from "@/server/validation/complaint.schema";

// Libro de Reclamaciones (fase 22b). Público, sin sesión; con límite de 5 por hora por IP.
export const POST = handle(async (req) => {
  // El límite va antes de validar: cada petición cuenta, también las rechazadas.
  const ip = obtenerIP(req.headers);
  const limite = await registrarIntento("reclamo", "ip", ip);
  if (!limite.permitido) throw demasiadosIntentos(limite.minutosRestantes);

  const datos = reclamoCrearSchema.parse(await req.json());
  const resultado = await crearReclamo(datos, { ip });
  return json(resultado, { status: 201, headers: SECURITY_HEADERS });
});
