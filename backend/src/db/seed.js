// Membuat 1 akun admin awal supaya kamu bisa login pertama kali.
// Setelah itu, admin bisa bikin akun staff lewat endpoint /api/auth/register.
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

async function seed() {
  const nama = 'Admin Utama';
  const email = 'admin@procurement.local';
  const passwordPlain = 'admin123'; // GANTI setelah login pertama!
  const hash = await bcrypt.hash(passwordPlain, 10);

  try {
    await pool.query(
      `INSERT INTO users (nama, email, password_hash, role)
       VALUES ($1, $2, $3, 'admin')
       ON CONFLICT (email) DO NOTHING`,
      [nama, email, hash]
    );
    console.log('✅ Seed selesai.');
    console.log(`   Login dengan email: ${email}`);
    console.log(`   Password: ${passwordPlain}  <-- ganti setelah login`);
  } catch (err) {
    console.error('❌ Seed gagal:', err.message);
  } finally {
    await pool.end();
  }
}

seed();
