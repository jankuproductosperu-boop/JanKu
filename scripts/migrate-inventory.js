require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

const ProductSchema = new mongoose.Schema({}, { strict: false });
const Product = mongoose.model("Product", ProductSchema);

// ── Configuración ──────────────────────────────────────────────────────────
// Cantidad inicial que se asignará a productos que NO tengan stockCantidad.
// Se basa en su estado de texto actual (Disponible/Limitado/Agotado) para
// no dejar todo en 0 de golpe. Ajusta estos números a tu criterio real.
const CANTIDAD_INICIAL = {
  "Disponible": 20,
  "Limitado": 3,
  "Agotado": 0,
};
const STOCK_MINIMO_DEFECTO = 5;

async function migrarInventario() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Conectado a MongoDB\n");

    const products = await Product.find({});
    console.log(`📦 Total productos: ${products.length}\n`);

    let migrados = 0;
    let yaTenian = 0;

    for (const product of products) {
      // Si ya tiene stockCantidad definido, no lo tocamos (para no pisar datos reales)
      if (typeof product.stockCantidad === "number") {
        yaTenian++;
        continue;
      }

      const estadoActual = product.stock || "Disponible";
      const cantidadInicial = CANTIDAD_INICIAL[estadoActual] ?? 10;

      await Product.updateOne(
        { _id: product._id },
        {
          $set: {
            stockCantidad: cantidadInicial,
            stockMinimo: STOCK_MINIMO_DEFECTO,
            precioCosto: product.precioCosto ?? 0,
            proveedor: product.proveedor ?? "",
            activo: product.activo ?? true,
          },
        }
      );

      console.log(`✅ ${product.nombre}`);
      console.log(`   Estado anterior: ${estadoActual} → stockCantidad asignado: ${cantidadInicial}\n`);
      migrados++;
    }

    console.log(`\n✅ Migración completada:`);
    console.log(`   ${migrados} productos actualizados`);
    console.log(`   ${yaTenian} productos ya tenían stockCantidad (no se tocaron)`);
    console.log(`\n⚠️  Revisa manualmente las cantidades asignadas — son estimaciones`);
    console.log(`   basadas en el estado anterior, no en tu inventario real.`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

migrarInventario();