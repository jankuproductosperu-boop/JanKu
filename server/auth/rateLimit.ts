import "server-only";
import { connectDB } from "@/server/db";
import RateLimit from "@/models/RateLimit";

export type Politica = "login-admin" | "login-user" | "register" | "resend-verif" | "forgot" | "order" | "coupon" | "reclamo";
export type TipoClave = "ip" | "email" | "user";

type Regla = { max: number; ventanaMs: number; bloqueoMs?: number };

const POLITICAS: Record<string, Regla> = {
  "login-admin:ip": { max: 3, ventanaMs: 3_600_000, bloqueoMs: 900_000 },
  // Por cuenta (aprobado por el dueño el 2026-11-13): un acierto de OTRA cuenta no lo reinicia.
  "login-admin:user": { max: 5, ventanaMs: 3_600_000, bloqueoMs: 900_000 },
  "login-user:ip": { max: 5, ventanaMs: 3_600_000, bloqueoMs: 900_000 },
  "register:ip": { max: 3, ventanaMs: 3_600_000 },
  "resend-verif:email": { max: 3, ventanaMs: 3_600_000 },
  "forgot:email": { max: 3, ventanaMs: 3_600_000 },
  "forgot:ip": { max: 10, ventanaMs: 3_600_000 },
  "order:ip": { max: 5, ventanaMs: 3_600_000 },
  "coupon:ip": { max: 10, ventanaMs: 600_000 },
  // Fase 22b: Libro de Reclamaciones.
  "reclamo:ip": { max: 5, ventanaMs: 3_600_000 },
};

export type EstadoLimite = {
  permitido: boolean; // false si este intento supera el máximo o hay bloqueo vigente
  bloqueado: boolean; // hay blockedUntil en el futuro
  restantes: number; // max - count, mínimo 0
  minutosRestantes?: number; // hasta fin de bloqueo o de ventana
  // Solo en registrarIntento: el intento recién contado es el número max o anterior.
  // Sirve para contar ANTES de comprobar credenciales sin que una ráfaga en paralelo pase entera.
  dentroDelLimite?: boolean;
};

type Registro = { count: number; windowStart: Date; blockedUntil: Date | null };

function regla(politica: Politica, tipo: TipoClave): Regla {
  const r = POLITICAS[`${politica}:${tipo}`];
  // Combinación no definida: error de programación, falla cerrado (500).
  if (!r) throw new Error(`Política de límite no definida: ${politica}:${tipo}`);
  return r;
}

function clave(politica: Politica, tipo: TipoClave, valor: string): string {
  return `${politica}:${tipo}:${valor}`;
}

/** true si el registro ya no cuenta: ventana vencida, o bloqueo que ya terminó. */
function caducado(reg: Registro, r: Regla, ahora: number): boolean {
  if (reg.windowStart.getTime() + r.ventanaMs < ahora) return true;
  return r.bloqueoMs !== undefined && reg.blockedUntil !== null && reg.blockedUntil.getTime() <= ahora;
}

function minutosHasta(fin: number, ahora: number): number {
  return Math.max(1, Math.ceil((fin - ahora) / 60_000));
}

function estadoDe(reg: Registro | null, r: Regla, ahora: number, trasRegistrar: boolean): EstadoLimite {
  if (!reg || caducado(reg, r, ahora)) {
    return { permitido: true, bloqueado: false, restantes: r.max };
  }
  const restantes = Math.max(0, r.max - reg.count);
  const finBloqueo = reg.blockedUntil?.getTime() ?? 0;

  if (r.bloqueoMs !== undefined) {
    const bloqueado = finBloqueo > ahora;
    return bloqueado
      ? { permitido: false, bloqueado: true, restantes, minutosRestantes: minutosHasta(finBloqueo, ahora) }
      : { permitido: true, bloqueado: false, restantes };
  }

  // Sin bloqueo: el intento número max se permite; el max + 1 no.
  // En consultar() se pregunta por el siguiente intento, que aún no se contó.
  const permitido = trasRegistrar ? reg.count <= r.max : reg.count < r.max;
  return permitido
    ? { permitido, bloqueado: false, restantes }
    : {
        permitido,
        bloqueado: false,
        restantes,
        minutosRestantes: minutosHasta(reg.windowStart.getTime() + r.ventanaMs, ahora),
      };
}

/** Lee sin modificar. Para comprobar un bloqueo antes de validar credenciales. */
export async function consultar(politica: Politica, tipo: TipoClave, valor: string): Promise<EstadoLimite> {
  const r = regla(politica, tipo);
  await connectDB();
  const reg = await RateLimit.findOne({ key: clave(politica, tipo, valor) })
    .select({ count: 1, windowStart: 1, blockedUntil: 1 })
    .lean<Registro>();
  return estadoDe(reg, r, Date.now(), false);
}

/**
 * Pipeline de una sola operación atómica:
 * - si no existe, la ventana venció o el bloqueo ya terminó → count = 1, windowStart = ahora, blockedUntil = null;
 * - si no → count + 1;
 * - con bloqueo y count >= max → blockedUntil = ahora + bloqueoMs;
 * - expiresAt = max(windowStart + ventanaMs, blockedUntil).
 */
function pipeline(key: string, r: Regla, ahora: Date) {
  const t = ahora.getTime();
  const reiniciar: Record<string, unknown>[] = [
    { $lt: [{ $add: [{ $ifNull: ["$windowStart", new Date(0)] }, r.ventanaMs] }, ahora] },
  ];
  if (r.bloqueoMs !== undefined) {
    reiniciar.push({
      $and: [{ $ne: [{ $ifNull: ["$blockedUntil", null] }, null] }, { $lte: ["$blockedUntil", ahora] }],
    });
  }

  const etapas: Record<string, unknown>[] = [
    { $set: { _reiniciar: { $or: reiniciar } } },
    {
      $set: {
        key,
        count: { $cond: ["$_reiniciar", 1, { $add: [{ $ifNull: ["$count", 0] }, 1] }] },
        windowStart: { $cond: ["$_reiniciar", ahora, "$windowStart"] },
        blockedUntil: { $cond: ["$_reiniciar", null, { $ifNull: ["$blockedUntil", null] }] },
      },
    },
  ];
  if (r.bloqueoMs !== undefined) {
    etapas.push({
      $set: {
        blockedUntil: { $cond: [{ $gte: ["$count", r.max] }, new Date(t + r.bloqueoMs), "$blockedUntil"] },
      },
    });
  }
  etapas.push(
    {
      $set: {
        expiresAt: { $max: [{ $add: ["$windowStart", r.ventanaMs] }, { $ifNull: ["$blockedUntil", ahora] }] },
      },
    },
    { $unset: "_reiniciar" },
  );
  return etapas;
}

function esClaveDuplicada(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === 11000;
}

/** Cuenta un intento (atómico) y devuelve el estado resultante. */
export async function registrarIntento(politica: Politica, tipo: TipoClave, valor: string): Promise<EstadoLimite> {
  const r = regla(politica, tipo);
  const key = clave(politica, tipo, valor);
  await connectDB();

  const ejecutar = () => {
    const ahora = new Date();
    return RateLimit.findOneAndUpdate({ key }, pipeline(key, r, ahora), {
      upsert: true,
      returnDocument: "after",
      updatePipeline: true,
    })
      .select({ count: 1, windowStart: 1, blockedUntil: 1 })
      .lean<Registro>()
      .then((reg) => ({ reg, ahora }));
  };

  let resultado: { reg: Registro | null; ahora: Date };
  try {
    resultado = await ejecutar();
  } catch (err) {
    // Dos upsert simultáneos sobre la misma clave: el segundo choca con el índice único.
    // Se reintenta una vez; ya existe el documento y la operación es un update normal.
    if (!esClaveDuplicada(err)) throw err;
    resultado = await ejecutar();
  }
  if (!resultado.reg) throw new Error("RateLimit: upsert sin documento");
  return {
    ...estadoDe(resultado.reg, r, resultado.ahora.getTime(), true),
    dentroDelLimite: resultado.reg.count <= r.max,
  };
}

/**
 * Deshace un intento contado por adelantado que al final no fue un fallo de credenciales
 * (p. ej. contraseña correcta pero email sin verificar). Atómico; si el bloqueo lo había
 * provocado solo ese intento, también lo quita.
 */
export async function anularIntento(politica: Politica, tipo: TipoClave, valor: string): Promise<void> {
  const r = regla(politica, tipo);
  await connectDB();
  const etapas: Record<string, unknown>[] = [
    { $set: { count: { $max: [0, { $subtract: [{ $ifNull: ["$count", 0] }, 1] }] } } },
  ];
  if (r.bloqueoMs !== undefined) {
    etapas.push({ $set: { blockedUntil: { $cond: [{ $lt: ["$count", r.max] }, null, "$blockedUntil"] } } });
  }
  await RateLimit.updateOne({ key: clave(politica, tipo, valor) }, etapas, { updatePipeline: true });
}

/** Borra el contador. Tras un login correcto. */
export async function reiniciar(politica: Politica, tipo: TipoClave, valor: string): Promise<void> {
  regla(politica, tipo);
  await connectDB();
  await RateLimit.deleteOne({ key: clave(politica, tipo, valor) });
}
