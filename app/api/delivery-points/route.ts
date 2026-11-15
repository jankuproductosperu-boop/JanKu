import { handle, json } from "@/server/http/respond";
import { listarPuntosActivos } from "@/server/services/deliveryPoint.service";

// Público: solo puntos activos y campos públicos (D-72).
export const GET = handle(async () => json(await listarPuntosActivos()));
