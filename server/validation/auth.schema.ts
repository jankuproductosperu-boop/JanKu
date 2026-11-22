import "server-only";
import { z } from "zod";

// Fase 26a (D-89): forma del cuerpo de las rutas de cuenta heredadas. Solo se valida el TIPO de cada
// campo (texto, objeto); las reglas de contenido y sus mensajes siguen en cada ruta, sin cambios, para
// no alterar respuestas (N1-4, N1-6). Sin .strict(): los campos de más se ignoran como siempre.
// Un cuerpo null, un arreglo o un campo con tipo equivocado ya no llega al código y no termina en 500.

const texto = z.string().max(10_000).optional();

/** Login de administrador y de cliente: el tipo lo revisan las rutas (cuenta como intento fallido). */
export const loginAdminCuerpoSchema = z.object({ username: z.unknown().optional(), password: z.unknown().optional() });
export const loginUserCuerpoSchema = z.object({ email: z.unknown().optional(), password: z.unknown().optional() });

export const registroCuerpoSchema = z.object({
  nombre: texto,
  email: texto,
  password: texto,
  aceptaTerminos: z.unknown().optional(),
});

export const recuperarCuerpoSchema = z.object({ email: texto });

export const restablecerCuerpoSchema = z.object({ token: texto, password: texto });

export const verificarCuerpoSchema = z.object({ token: texto });

export const perfilActualizarCuerpoSchema = z.object({
  nombre: texto,
  telefono: z.unknown().optional(), // la ruta ya responde su propio 400 con fields.telefono
  direccion: z
    .object({ calle: texto, ciudad: texto, departamento: texto, codigoPostal: texto })
    .optional(),
});

export const perfilEliminarCuerpoSchema = z.object({ password: texto });
