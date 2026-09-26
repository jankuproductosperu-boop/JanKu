require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

const ProductSchema = new mongoose.Schema({}, { strict: false });
const Product = mongoose.model("Product", ProductSchema);

async function migrarCodigoUrl() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Conectado a MongoDB\n");

    const products = await Product.find({
      $or: [
        { codigoUrl: { $exists: false } },
        { codigoUrl: null },
        { codigoUrl: "" },
      ],
    });

    console.log(`📦 Productos sin código de URL: ${products.length}\n`);

    let migrados = 0;

    for (const product of products) {
      const codigoUrl = product._id.toString().slice(-8);

      await Product.updateOne(
        { _id: product._id },
        { $set: { codigoUrl } }
      );

      console.log(`✅ ${product.nombre || "(sin nombre)"} → ${codigoUrl}`);
      migrados++;
    }

    console.log(`\n✅ Migración completada: ${migrados} productos actualizados`);
    console.log(`   Los productos que ya tenían codigoUrl no se tocaron.`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

migrarCodigoUrl();