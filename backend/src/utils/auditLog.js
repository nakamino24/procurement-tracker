const pool = require('../config/db');

// Catat 1 baris histori perubahan ke audit_log. Dipanggil dari controller
// manapun yang ngubah data penting (pengadaan, metode, status tahap).
async function logAudit(pengadaanId, userId, aksi, detail = null) {
  try {
    await pool.query(
      `INSERT INTO audit_log (pengadaan_id, user_id, aksi, detail) VALUES ($1, $2, $3, $4)`,
      [pengadaanId, userId, aksi, detail]
    );
  } catch (err) {
    console.error('Gagal mencatat audit log:', err.message);
  }
}

module.exports = { logAudit };