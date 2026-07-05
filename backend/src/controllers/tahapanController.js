const pool = require('../config/db');

const STATUS_VALID = ['Belum Mulai', 'Proses', 'Selesai', 'Tertunda', 'Batal'];

// PUT /api/tahapan/:id  body: { status, catatan }
// CATATAN: tahapan BOLEH dikerjakan paralel / tidak berurutan. Di lapangan,
// banyak tahap yang formalnya berurutan tapi praktiknya jalan bersamaan
// (misal Kelengkapan Dokumen sudah disiapkan walau Konfirmasi Anggaran
// masih proses). Jadi di sini TIDAK ADA pengecekan "tahap sebelumnya harus
// Selesai dulu" -- staff/admin bebas update status tahap manapun kapan saja.
// Urutan (`urutan` di tahapan_master) tetap dipakai untuk TAMPILAN dan
// perhitungan dashboard (stuck per tahap, rata-rata durasi), bukan untuk
// membatasi input.
async function updateStatus(req, res) {
  const { id } = req.params; // id di tabel pengadaan_tahapan
  const { status, catatan } = req.body;

  if (!STATUS_VALID.includes(status)) {
    return res.status(400).json({ message: `Status harus salah satu dari: ${STATUS_VALID.join(', ')}` });
  }

  try {
    const current = await pool.query(
      `SELECT pt.*, tm.urutan, tm.nama_tahap
       FROM pengadaan_tahapan pt
       JOIN tahapan_master tm ON tm.id = pt.tahapan_master_id
       WHERE pt.id = $1`,
      [id]
    );
    const tahap = current.rows[0];
    if (!tahap) return res.status(404).json({ message: 'Tahapan tidak ditemukan.' });

    if (req.user.role === 'staff') {
      const owner = await pool.query('SELECT pic_user_id FROM pengadaan WHERE id = $1', [tahap.pengadaan_id]);
      if (owner.rows[0]?.pic_user_id !== req.user.id) {
        return res.status(403).json({ message: 'Kamu tidak punya akses ke pengadaan ini.' });
      }
    }

    const { rows } = await pool.query(
      `UPDATE pengadaan_tahapan
       SET status = $1, catatan = COALESCE($2, catatan), tanggal_update = now(), updated_by = $3
       WHERE id = $4 RETURNING *`,
      [status, catatan, req.user.id, id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal update status tahapan.' });
  }
}

module.exports = { updateStatus };