// Reglas puras del popup de oferta (D-59). Sin dependencias de servidor ni de React.

export const HORAS_SILENCIO = 24;
const MS_HORA = 60 * 60 * 1000;

/** Solo rutas internas ("/algo", nunca "//host") o enlaces https. */
export function enlaceSeguro(enlace: string): boolean {
  return /^\/(?!\/)\S*$/.test(enlace) || /^https:\/\/\S+$/i.test(enlace);
}

export function popupVigente(
  p: { activo: boolean; desde?: string | null; hasta?: string | null },
  ahora: number = Date.now(),
): boolean {
  if (!p.activo) return false;
  if (p.desde) {
    const desde = Date.parse(p.desde);
    if (Number.isFinite(desde) && ahora < desde) return false;
  }
  if (p.hasta) {
    const hasta = Date.parse(p.hasta);
    if (Number.isFinite(hasta) && ahora > hasta) return false;
  }
  return true;
}

export type CierrePopup = { version: string; en: number };

/** No se vuelve a mostrar durante HORAS_SILENCIO tras cerrarlo, salvo que el popup haya cambiado. */
export function debeMostrarPopup(
  cierre: CierrePopup | null,
  version: string,
  ahora: number = Date.now(),
): boolean {
  if (!cierre || cierre.version !== version) return true;
  return ahora - cierre.en >= HORAS_SILENCIO * MS_HORA;
}
