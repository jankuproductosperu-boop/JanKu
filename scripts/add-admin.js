require('dotenv').config({ path: '.env.local' });
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const readline = require('readline');

const MONGODB_URI = process.env.MONGODB_URI;

const AdminUserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  nombre: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  activo: { type: Boolean, default: true },
  ultimoAcceso: { type: Date }
}, { timestamps: true });

const AdminUser = mongoose.models.AdminUser || mongoose.model("AdminUser", AdminUserSchema);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function addAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Conectado a MongoDB\n");

    const username = await ask('Username: ');
    const password = await ask('Contraseña: ');
    const nombre = await ask('Nombre completo: ');
    const email = await ask('Email: ');

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await AdminUser.create({
      username,
      password: hashedPassword,
      nombre,
      email,
      activo: true
    });

    console.log("\n✅ Admin creado exitosamente:");
    console.log(`   Username: ${admin.username}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Contraseña: ${password}`);

    await mongoose.connection.close();
    rl.close();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.code === 11000) {
      console.log("El username o email ya existe.");
    }
    await mongoose.connection.close();
    rl.close();
    process.exit(1);
  }
}

addAdmin();