import "server-only";
import { z } from "zod";

// Las mismas reglas están copiadas en scripts/admin/crear-admin.mjs y cambiar-password.mjs:
// si cambian aquí, cambian allí.
const ROLES = ["superadmin", "gestor", "ventas"] as const;

const password = z
  .string()
  .min(10, "Mínimo 10 caracteres")
  .max(200)
  .regex(/[A-Z]/, "Debe tener una mayúscula")
  .regex(/[a-z]/, "Debe tener una minúscula")
  .regex(/[0-9]/, "Debe tener un número");

export const adminCrearSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3)
      .max(50)
      .regex(/^[a-zA-Z0-9._-]+$/, "Solo letras, números, punto, guion"),
    nombre: z.string().trim().min(2).max(100),
    email: z.string().trim().toLowerCase().email().max(200),
    rol: z.enum(ROLES),
    password,
  })
  .strict();

export const adminActualizarSchema = z
  .object({
    nombre: z.string().trim().min(2).max(100).optional(),
    email: z.string().trim().toLowerCase().email().max(200).optional(),
    rol: z.enum(ROLES).optional(),
    activo: z.boolean().optional(),
    password: password.optional(),
  })
  .strict();

export type AdminCrear = z.infer<typeof adminCrearSchema>;
export type AdminActualizar = z.infer<typeof adminActualizarSchema>;
