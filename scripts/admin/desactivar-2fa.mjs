// Salida de emergencia (fase 26b, Q4): desactiva la verificación en dos pasos de UN administrador
// cuando perdió el celular y los códigos de rescate. Cierra sus sesiones abiertas (tokenVersion + 1).
//   node scripts/admin/desactivar-2fa.mjs
// Lo ejecuta SOLO el dueño. Pide confirmar la base y escribir el usuario dos veces.
// No borra campos (N1-3): deja totp = { activo: false } y la lista de códigos de rescate vacía.
// Nunca imprime secretos, hashes ni la URI. Si es superadmin, el panel le pedirá activarla de nuevo.

import mongoose from "mongoose";
import { cargarUri, destino, mensajeSeguro, preguntar } from "../migrations/_runner.mjs";

async function main() {
  const uri = cargarUri();
  const { host, base } = destino(uri);
  console.log("Desactivar la verificación en dos pasos de un administrador");
  console.log(`Host: ${host}`);
  console.log(`Base: ${base}`);
  const ok = await preguntar("¿Continuar en esta base? (si/no): ");
  if (!["si", "sí", "s"].includes(ok.toLowerCase())) {
    console.log("Cancelado.");
    return 0;
  }

  const username = await preguntar("Usuario: ");
  if (!username) {
    console.error("Usuario vacío. No se cambió nada.");
    return 1;
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  const col = mongoose.connection.db.collection("adminusers");

  const doc = await col.findOne({ username }, { projection: { username: 1, totp: 1 } });
  if (!doc) {
    console.error(`No existe el administrador "${username}". No se cambió nada.`);
    return 1;
  }
  if (doc.totp?.activo !== true) {
    console.log(`"${username}" no tiene la verificación en dos pasos activa. No se cambió nada.`);
    return 0;
  }

  const repetido = await preguntar(`Escribe otra vez el usuario (${username}) para confirmar: `);
  if (repetido !== username) {
    console.log("No coincide. Cancelado; no se cambió nada.");
    return 0;
  }

  const res = await col.updateOne(
    { _id: doc._id, "totp.activo": true },
    {
      $set: { totp: { activo: false }, codigosRescate: [], updatedAt: new Date() },
      $inc: { tokenVersion: 1 },
    },
  );
  if (res.modifiedCount !== 1) {
    console.error("No se pudo desactivar (¿cambió mientras tanto?). Vuelve a intentarlo.");
    return 1;
  }

  console.log(`Verificación en dos pasos desactivada para ${username}. Sus sesiones abiertas se cerraron.`);
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
