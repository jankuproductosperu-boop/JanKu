const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

console.log("🔄 Iniciando script...");

const MONGODB_URI = "mongodb+srv://jankuproductosperu_db_user:cYS0WNzupgOSYaXQ@janku-cluster.fbqpb0e.mongodb.net/jankuDB?retryWrites=true&w=majority";

console.log("🔄 Conectando a MongoDB...");

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
    console.log("🔄 Intentando conectar...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Conectado a MongoDB");

    const hashedPassword = await bcrypt.hash("admin123", 10);
    console.log("✅ Contraseña hasheada");

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