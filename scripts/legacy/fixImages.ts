// LEGACY: script ya aplicado. No ejecutar sin revisar. Ver docs/plan/02-datos.md
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "TU_URI_DE_MONGO_AQUI";

// Definimos el esquema que coincide con tu colección
const productSchema = new mongoose.Schema({
  nombre: String,
  precio: Number,
  descripcion: String,
  categoria: String,
  stock: Number,
  imagenUrl: String,
}, { collection: "products" });

const Product = mongoose.model("Product", productSchema);

async function main() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Conectado a MongoDB");

    const res = await Product.updateMany(
      { imagenUrl: /imageonline.co/ }, // Todas las URLs antiguas
      { $set: { imagenUrl: "https://img.jan-ku.com/placeholder.jpg" } } // Nueva URL
    );

    console.log(`📝 Documentos actualizados: ${res.modifiedCount}`);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();

