
// Satu pool koneksi dipakai di seluruh aplikasi (best practice pg).
// Pool = kumpulan koneksi yang di-reuse, jadi tiap query tidak perlu
// buka-tutup koneksi baru (mahal & lambat).
require('dotenv').config();
const { Pool } = require('pg');
 
// Kalau DATABASE_URL disediakan (misal di Railway/Render saat production),
// pakai itu. Kalau tidak, susun dari variabel terpisah (PGHOST, PGUSER, dst)
// -- cara ini lebih tahan terhadap isu parsing URL yang sering muncul di
// Windows (karakter tersembunyi, line ending, dsb).
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    })
  : new Pool({
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT) || 5432,
      user: process.env.PGUSER || 'postgres',
      password: String(process.env.PGPASSWORD || ''),
      database: process.env.PGDATABASE || 'procurement_db',
    });
 
pool.on('error', (err) => {
  console.error('Unexpected DB pool error:', err);
});
 
module.exports = pool;