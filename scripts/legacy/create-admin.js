// LEGACY: script ya aplicado. No ejecutar sin revisar. Ver docs/plan/02-datos.md
require('dotenv').config({ path: '.env.local' });
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI; // ✅ Leer de .env.local

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI no encontrada en .env.local");
  process.exit(1);
}

const AdminUserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  nombre: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  activo: { type: Boolean, default: true },
  ultimoAcceso: { type: Date }
}, { timestamps: true });

const AdminUser = mongoose.models.AdminUser || mongoose.model("AdminUser", AdminUserSchema);

async function createAdmin() {
  try {
    console.log("🔄 Conectando a MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Conectado a MongoDB");

    const hashedPassword = await bcrypt.hash("admin123", 10);

    const admin = await AdminUser.create({
      username: "admin",
      password: hashedPassword,
      nombre: "Administrador Principal",
      email: "admin@janku.com",
      activo: true
    });

    console.log("✅ Admin creado:");
    console.log("   Username: admin");
    console.log("   Password: admin123");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

createAdmin();