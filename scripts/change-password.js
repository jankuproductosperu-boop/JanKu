require('dotenv').config({ path: '.env.local' });
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const readline = require('readline');

const MONGODB_URI = process.env.MONGODB_URI;

const AdminUserSchema = new mongoose.Schema({
  username: String,
  password: String,
  nombre: String,
  email: String
});

const AdminUser = mongoose.model("AdminUser", AdminUserSchema);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function changePassword() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Conectado a MongoDB\n");

    rl.question('Usuario a modificar: ', async (username) => {
      rl.question('Nueva contraseña: ', async (newPassword) => {
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        const result = await AdminUser.updateOne(
          { username },
          { password: hashedPassword }
        );

        if (result.modifiedCount > 0) {
          console.log("\n✅ Contraseña actualizada exitosamente");
          console.log(`   Usuario: ${username}`);
          console.log(`   Nueva contraseña: ${newPassword}`);
        } else {
          console.log("\n❌ Usuario no encontrado");
        }

        await mongoose.connection.close();
        rl.close();
        process.exit(0);
      });
    });
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

changePassword();