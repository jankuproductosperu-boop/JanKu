import { handle, json } from "@/server/http/respond";
import { obtenerPopupPublico } from "@/server/services/popup.service";

// Público: devuelve el popup vigente o null.
export const GET = handle(async () => json(await obtenerPopupPublico()));
