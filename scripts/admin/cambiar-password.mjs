// Cambio interactivo de contraseña de un administrador. Cierra sus sesiones abiertas (tokenVersion + 1).
//   node scripts/admin/cambiar-password.mjs
// Nunca imprime la contraseña, el hash ni la URI.

import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { z } from "zod";
import { cargarUri, destino, mensajeSeguro, preguntar, preguntarOculto } from "../migrations/_runner.mjs";

// Mismas reglas de contraseña que server/validation/admin-user.schema.ts.
const password = z
  .string()
  .min(10, "Mínimo 10 caracteres")
  .max(200)
  .regex(/[A-Z]/, "Debe tener una mayúscula")
  .regex(/[a-z]/, "Debe tener una minúscula")
  .regex(/[0-9]/, "Debe tener un número");

async function main() {
  const uri = cargarUri();
  const { host, base } = destino(uri);
  console.log("Cambio de contraseña de administrador");
  console.log(`Host: ${host}`);
  console.log(`Base: ${base}`);
  const ok = await preguntar("¿Continuar en esta base? (si/no): ");
  if (!["si", "sí", "s"].includes(ok.toLowerCase())) {
    console.log("Cancelado.");
    return 0;
  }

  const username = await preguntar("Usuario: ");
  const pass1 = await preguntarOculto("Contraseña nueva (mín. 10, mayúscula, minúscula y número): ");
  const pass2 = await preguntarOculto("Repite la contraseña: ");

  if (pass1 !== pass2) {
    console.error("Las contraseñas no coinciden. No se cambió nada.");
    return 1;
  }
  const r = password.safeParse(pass1);
  if (!r.success) {
    console.error(`Contraseña inválida. No se cambió nada.\n${r.error.issues.map((i) => `  · ${i.message}`).join("\n")}`);
    return 1;
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  const col = mongoose.connection.db.collection("adminusers");

  const res = await col.updateOne(
    { username },
    {
      $set: { password: await bcrypt.hash(r.data, 12), updatedAt: new Date() },
      $inc: { tokenVersion: 1 },
    },
  );
  if (res.matchedCount === 0) {
    console.error(`No existe el administrador "${username}". No se cambió nada.`);
    return 1;
  }

  console.log(`Contraseña actualizada para ${username}. Sus sesiones abiertas se cerraron.`);
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
