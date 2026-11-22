import "server-only";
import { z } from "zod";

// Fase 26b: verificación en dos pasos. El formato del código (6 dígitos o código de rescate) lo
// decide el servicio: aquí solo se limita el tipo y el largo, para no dar pistas distintas por campo.

const codigo = z.string().min(1, "Escribe el código").max(32);
const password = z.string().min(1, "Escribe tu contraseña").max(200);

export const login2faSchema = z.object({ codigo }).strict();
export const seguridadIniciarSchema = z.object({ password }).strict();
export const seguridadConfirmarSchema = z.object({ codigo }).strict();
/** Desactivar y regenerar códigos de rescate piden las dos cosas. */
export const seguridadVerificarSchema = z.object({ password, codigo }).strict();

export type SeguridadVerificar = z.infer<typeof seguridadVerificarSchema>;
