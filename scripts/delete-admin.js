require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

const AdminUserSchema = new mongoose.Schema({
  username: String,
  password: String
});

const AdminUser = mongoose.model("AdminUser", AdminUserSchema);

async function deleteAdmin() {
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Conectado");

  const result = await AdminUser.deleteMany({});
  console.log(`🗑️ Eliminados ${result.deletedCount} usuarios`);

  await mongoose.connection.close();
  process.exit(0);
}

deleteAdmin();