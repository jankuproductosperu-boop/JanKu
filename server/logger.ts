import "server-only";

type Datos = Record<string, unknown>;

function linea(nivel: string, evento: string, datos?: Datos): string {
  return JSON.stringify({ nivel, evento, ts: new Date().toISOString(), ...datos });
}

export const log = {
  info(evento: string, datos?: Datos): void {
    console.log(linea("info", evento, datos));
  },
  warn(evento: string, datos?: Datos): void {
    console.warn(linea("warn", evento, datos));
  },
  error(evento: string, error: unknown, datos?: Datos): void {
    const e = error instanceof Error ? error : new Error(String(error));
    console.error(
      linea("error", evento, {
        ...datos,
        mensaje: e.message,
        ...(process.env.NODE_ENV !== "production" ? { stack: e.stack } : {}),
      }),
    );
  },
};
