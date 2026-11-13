// Alta interactiva de un administrador. Sin contraseñas fijas.
//   node scripts/admin/crear-admin.mjs
// Nunca imprime la contraseña, el hash ni la URI.

import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { z } from "zod";
import { cargarUri, destino, mensajeSeguro, preguntar, preguntarOculto } from "../migrations/_runner.mjs";

// Mismas reglas que adminCrearSchema (server/validation/admin-user.schema.ts).
const ROLES = ["superadmin", "gestor", "ventas"];
const password = z
  .string()
  .min(10, "Mínimo 10 caracteres")
  .max(200)
  .regex(/[A-Z]/, "Debe tener una mayúscula")
  .regex(/[a-z]/, "Debe tener una minúscula")
  .regex(/[0-9]/, "Debe tener un número");
const esquema = z
  .object({
    username: z.string().trim().min(3).max(50).regex(/^[a-zA-Z0-9._-]+$/, "Solo letras, números, punto, guion"),
    nombre: z.string().trim().min(2).max(100),
    email: z.string().trim().toLowerCase().email().max(200),
    rol: z.enum(ROLES),
    password,
  })
  .strict();

const exacto = (v) => new RegExp(`^${v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");

function errores(err) {
  return err.issues.map((i) => `  · ${i.path.join(".")}: ${i.message}`).join("\n");
}

async function main() {
  const uri = cargarUri();
  const { host, base } = destino(uri);
  console.log("Alta de administrador");
  console.log(`Host: ${host}`);
  console.log(`Base: ${base}`);
  const ok = await preguntar("¿Crear el administrador en esta base? (si/no): ");
  if (!["si", "sí", "s"].includes(ok.toLowerCase())) {
    console.log("Cancelado.");
    return 0;
  }

  const username = await preguntar("Usuario: ");
  const nombre = await preguntar("Nombre: ");
  const email = await preguntar("Email: ");
  const rol = await preguntar(`Rol (${ROLES.join(" / ")}): `);
  const pass1 = await preguntarOculto("Contraseña (mín. 10, mayúscula, minúscula y número): ");
  const pass2 = await preguntarOculto("Repite la contraseña: ");

  if (pass1 !== pass2) {
    console.error("Las contraseñas no coinciden. No se creó nada.");
    return 1;
  }

  const r = esquema.safeParse({ username, nombre, email, rol, password: pass1 });
  if (!r.success) {
    console.error(`Datos inválidos. No se creó nada.\n${errores(r.error)}`);
    return 1;
  }
  const datos = r.data;

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  const col = mongoose.connection.db.collection("adminusers");

  const existe = await col.findOne(
    { $or: [{ username: exacto(datos.username) }, { email: exacto(datos.email) }] },
    { projection: { _id: 1 } },
  );
  if (existe) {
    console.error("Ya existe un administrador con ese usuario o correo. No se creó nada.");
    return 1;
  }

  const ahora = new Date();
  await col.insertOne({
    username: datos.username,
    password: await bcrypt.hash(datos.password, 12),
    nombre: datos.nombre,
    email: datos.email,
    activo: true,
    rol: datos.rol,
    tokenVersion: 0,
    createdAt: ahora,
    updatedAt: ahora,
  });

  console.log(`Admin creado: ${datos.username} (${datos.rol})`);
  return 0;
}

let codigo = 1;
try {
  codigo = await main();
} catch (err) {
  console.error(`Error: ${mensajeSeguro(err)}`);
  codigo = 1;
} finally {
  await mongoose.disconnect().catch(() => {});
  process.exit(codigo);
}
