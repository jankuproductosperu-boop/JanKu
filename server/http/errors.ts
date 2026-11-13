import "server-only";

export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const entradaInvalida = (fields?: Record<string, string>, mensaje = "Datos inválidos") =>
  new AppError(400, mensaje, "ENTRADA_INVALIDA", fields);
export const noAutorizado = (mensaje = "No autorizado") => new AppError(401, mensaje, "NO_AUTORIZADO");
export const prohibido = (mensaje = "No tienes permiso para esta acción") =>
  new AppError(403, mensaje, "PROHIBIDO");
export const noEncontrado = (que: string) => new AppError(404, `${que} no encontrado`, "NO_ENCONTRADO");
export const conflicto = (mensaje: string, code = "CONFLICTO") => new AppError(409, mensaje, code);
export const demasiadosIntentos = (minutos?: number) =>
  new AppError(
    429,
    minutos ? `Demasiados intentos. Intenta en ${minutos} minutos.` : "Demasiados intentos. Intenta más tarde.",
    "DEMASIADOS_INTENTOS",
  );
