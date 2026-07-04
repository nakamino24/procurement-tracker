// Menjalankan schema.sql ke database yang ditunjuk DATABASE_URL.
// Jalankan sekali di awal (dan tiap kali schema.sql berubah, hapus dulu
// tabel lama atau pakai DB baru -- ini bukan migration tool bertingkat,
// cuma runner sederhana untuk tahap belajar/skala kecil).
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  try {
    await pool.query(sql);
    console.log('✅ Migrasi berhasil: semua tabel & trigger sudah dibuat.');
  } catch (err) {
    console.error('❌ Migrasi gagal:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
