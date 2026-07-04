const pool = require('../config/db');

const STATUS_VALID = ['Belum Mulai', 'Proses', 'Selesai', 'Tertunda'];

// PUT /api/tahapan/:id  body: { status, catatan }
// Aturan bisnis "harus berurutan": tahap ini hanya boleh diubah jadi
// 'Proses' atau 'Selesai' kalau tahap SEBELUMNYA (urutan - 1) sudah
// berstatus 'Selesai'. Status 'Tertunda' boleh kapan saja (menandakan
// tahap ini macet). Tahap pertama (urutan = 1) selalu boleh diubah.
async function updateStatus(req, res) {
  const { id } = req.params; // ini adalah id di tabel pengadaan_tahapan
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

    if ((status === 'Proses' || status === 'Selesai') && tahap.urutan > 1) {
      const prev = await pool.query(
        `SELECT pt.status FROM pengadaan_tahapan pt
         JOIN tahapan_master tm ON tm.id = pt.tahapan_master_id
         WHERE pt.pengadaan_id = $1 AND tm.urutan = $2`,
        [tahap.pengadaan_id, tahap.urutan - 1]
      );
      if (prev.rows[0] && prev.rows[0].status !== 'Selesai') {
        return res.status(400).json({
          message: `Tidak bisa lanjut: tahap sebelumnya belum "Selesai".`,
        });
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
