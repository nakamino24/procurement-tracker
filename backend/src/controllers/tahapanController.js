const pool = require('../config/db');
const { logAudit } = require('../utils/auditLog');

const STATUS_VALID = ['Belum Mulai', 'Proses', 'Selesai', 'Tertunda', 'Batal'];

// PUT /api/tahapan/:id  body: { status, catatan }
// CATATAN: tahapan BOLEH dikerjakan paralel / tidak berurutan (lihat
// riwayat perubahan sebelumnya) -- tidak ada pengecekan "tahap sebelumnya
// harus Selesai dulu".
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

    // tanggal_mulai_tahap diisi SEKALI SAJA -- pertama kali status keluar
    // dari "Belum Mulai". Dipakai untuk hitung SLA (target_hari vs realisasi).
    const { rows } = await pool.query(
      `UPDATE pengadaan_tahapan
       SET status = $1::tahap_status,
           catatan = COALESCE($2, catatan),
           tanggal_update = now(),
           updated_by = $3,
           tanggal_mulai_tahap = COALESCE(tanggal_mulai_tahap, CASE WHEN $1::tahap_status != 'Belum Mulai' THEN now() ELSE NULL END)
       WHERE id = $4 RETURNING *`,
      [status, catatan, req.user.id, id]
    );

    await logAudit(
      tahap.pengadaan_id,
      req.user.id,
      `Update tahap "${tahap.nama_tahap}"`,
      `Status jadi "${status}"${catatan ? ` — Catatan: ${catatan}` : ''}`
    );

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal update status tahapan.' });
  }
}

module.exports = { updateStatus };