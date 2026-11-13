import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/server/http/errors";
import { log } from "@/server/logger";

export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

export function json<T>(
  data: T,
  init?: { status?: number; headers?: Record<string, string> },
): NextResponse {
  return NextResponse.json(data, { status: init?.status ?? 200, headers: init?.headers });
}

export function fail(error: AppError): NextResponse {
  const cuerpo: { error: string; code: string; fields?: Record<string, string> } = {
    error: error.message,
    code: error.code,
  };
  if (error.fields) cuerpo.fields = error.fields;
  return NextResponse.json(cuerpo, { status: error.status });
}

type Ctx = { params: Promise<Record<string, string>> };

function esObjeto(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function aAppError(err: unknown): AppError | null {
  if (err instanceof AppError) return err;
  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) {
      const clave = issue.path.join(".");
      if (!(clave in fields)) fields[clave] = issue.message;
    }
    return new AppError(400, "Datos inválidos", "ENTRADA_INVALIDA", fields);
  }
  if (err instanceof SyntaxError) return new AppError(400, "Formato inválido", "ENTRADA_INVALIDA");
  if (esObjeto(err) && err.code === 11000) {
    const fields: Record<string, string> = {};
    if (esObjeto(err.keyPattern)) {
      for (const k of Object.keys(err.keyPattern)) fields[k] = "Ya existe un registro con ese valor";
    }
    return new AppError(
      409,
      "Ya existe un registro con ese valor",
      "DUPLICADO",
      Object.keys(fields).length ? fields : undefined,
    );
  }
  if (esObjeto(err) && err.name === "CastError") {
    return new AppError(404, "Registro no encontrado", "NO_ENCONTRADO");
  }
  return null;
}

export function handle(
  fn: (req: NextRequest, ctx: Ctx) => Promise<Response>,
): (req: NextRequest, ctx: Ctx) => Promise<Response> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      const conocido = aAppError(err);
      if (conocido) return fail(conocido);
      log.error("error_no_controlado", err, { metodo: req.method, ruta: req.nextUrl.pathname });
      return NextResponse.json({ error: "Error en el servidor", code: "ERROR_INTERNO" }, { status: 500 });
    }
  };
}
