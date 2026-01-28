require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

const ProductSchema = new mongoose.Schema({}, { strict: false });
const Product = mongoose.model("Product", ProductSchema);

const CategorySchema = new mongoose.Schema({
  nombre: String,
  slug: String
});
const Category = mongoose.model("Category", CategorySchema);

async function migrateCategories() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Conectado a MongoDB\n");

    const products = await Product.find({});
    const categories = await Category.find({});
    
    console.log(`📦 Total productos: ${products.length}\n`);

    let migrated = 0;

    for (const product of products) {
      // Si ya tiene categorias[] array, actualizar slugs
      let categorias = [];
      let categoriaSlugs = [];

      if (product.categorias && Array.isArray(product.categorias)) {
        categorias = product.categorias;
        categoriaSlugs = categorias.map(catName => {
          const cat = categories.find(c => c.nombre === catName);
          return cat?.slug || '';
        }).filter(Boolean);
      } 
      // Si tiene categoria string vieja, migrar
      else if (product.categoria) {
        categorias = [product.categoria];
        const cat = categories.find(c => c.nombre === product.categoria);
        categoriaSlugs = cat?.slug ? [cat.slug] : [];
      }

      await Product.updateOne(
        { _id: product._id },
        { 
          $set: { categorias, categoriaSlugs },
          $unset: { categoria: "", categoriaSlug: "" }
        }
      );

      console.log(`✅ ${product.nombre}`);
      console.log(`   Categorías: ${categorias.join(', ') || 'Sin categoría'}`);
      console.log(`   Slugs: ${categoriaSlugs.join(', ') || 'Sin slug'}\n`);
      migrated++;
    }

    console.log(`✅ Migración completada: ${migrated} productos actualizados`);
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

migrateCategories();