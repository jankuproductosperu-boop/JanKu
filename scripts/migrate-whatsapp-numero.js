require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

const ProductSchema = new mongoose.Schema({}, { strict: false });
const Product = mongoose.model("Product", ProductSchema);

const PromotionSchema = new mongoose.Schema({}, { strict: false }, { collection: "promotions" });
const Promotion = mongoose.model("PromotionMigracion", PromotionSchema, "promotions");

// Extrae el número de un link tipo:
// https://wa.me/51978339737?text=... → "51978339737"
function extraerNumero(whatsappLink) {
  if (!whatsappLink) return null;
  const match = whatsappLink.match(/wa\.me\/(\d+)/);
  return match ? match[1] : null;
}

async function migrarColeccion(Modelo, nombreColeccion) {
  const docs = await Modelo.find({
    whatsappLink: { $exists: true, $ne: "" },
    $or: [{ whatsappNumero: { $exists: false } }, { whatsappNumero: "" }],
  });

  console.log(`📦 ${nombreColeccion} con link viejo pero sin número: ${docs.length}\n`);

  let migrados = 0;
  let sinNumeroDetectado = 0;

  for (const doc of docs) {
    const numero = extraerNumero(doc.whatsappLink);

    if (!numero) {
      console.log(`⚠️  No se pudo extraer número de: ${doc.nombre || doc.titulo} — link: ${doc.whatsappLink}`);
      sinNumeroDetectado++;
      continue;
    }

    await Modelo.updateOne(
      { _id: doc._id },
      { $set: { whatsappNumero: numero } }
    );

    console.log(`✅ ${doc.nombre || doc.titulo} → ${numero}`);
    migrados++;
  }

  console.log(`\n✅ ${nombreColeccion}: ${migrados} migrados, ${sinNumeroDetectado} sin número detectado (revisar manualmente)\n`);
}

async function main() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Conectado a MongoDB\n");

    await migrarColeccion(Product, "Productos");
    await migrarColeccion(Promotion, "Promociones");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

main();