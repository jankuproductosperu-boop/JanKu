import { handle, json } from "@/server/http/respond";
import { requireAdmin } from "@/server/auth/guards";
import { popupGuardarSchema } from "@/server/validation/popup.schema";
import { guardarPopup, obtenerPopupAdmin } from "@/server/services/popup.service";

export const GET = handle(async () => {
  await requireAdmin("catalogo.editar");
  return json(await obtenerPopupAdmin());
});

export const PUT = handle(async (req) => {
  await requireAdmin("catalogo.editar");
  const datos = popupGuardarSchema.parse(await req.json());
  return json(await guardarPopup(datos));
});
