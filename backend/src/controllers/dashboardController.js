const pool = require('../config/db');

// GET /api/dashboard/summary
// Mengembalikan 3 hal sekaligus:
// 1. stuck_per_tahap: berapa pengadaan yang "stuck" (belum Selesai) di tiap tahap
// 2. avg_durasi_per_tahap: rata-rata hari dari tanggal_update tahap sebelumnya
//    ke tahap ini (proxy sederhana durasi pengerjaan tiap tahap)
// 3. progress_items: progress % tiap pengadaan (dipakai buat progress bar)
async function summary(req, res) {
  try {
    const stuck = await pool.query(`
      SELECT tm.nama_tahap, tm.urutan, COUNT(*) AS jumlah_stuck
      FROM pengadaan_tahapan pt
      JOIN tahapan_master tm ON tm.id = pt.tahapan_master_id
      WHERE pt.status IN ('Proses', 'Tertunda')
      GROUP BY tm.nama_tahap, tm.urutan
      ORDER BY tm.urutan
    `);

    // Durasi dihitung antar tahap yang SUDAH selesai, berdasarkan selisih
    // tanggal_update dengan tahap sebelumnya (juga sudah selesai).
    const avgDurasi = await pool.query(`
      SELECT tm.nama_tahap, tm.urutan,
        ROUND(AVG(EXTRACT(EPOCH FROM (pt.tanggal_update - prev.tanggal_update)) / 86400)::numeric, 1) AS rata_rata_hari
      FROM pengadaan_tahapan pt
      JOIN tahapan_master tm ON tm.id = pt.tahapan_master_id
      LEFT JOIN pengadaan_tahapan prev
        ON prev.pengadaan_id = pt.pengadaan_id
        AND prev.tahapan_master_id = (
          SELECT id FROM tahapan_master WHERE urutan = tm.urutan - 1
        )
      WHERE pt.status = 'Selesai' AND prev.status = 'Selesai'
      GROUP BY tm.nama_tahap, tm.urutan
      ORDER BY tm.urutan
    `);

    const progressItems = await pool.query(`
      SELECT p.id, p.nama_pengadaan, p.vendor, p.pic,
        COALESCE(ROUND(100.0 * COUNT(*) FILTER (WHERE pt.status = 'Selesai') / NULLIF(COUNT(*), 0)), 0) AS progress_percent
      FROM pengadaan p
      LEFT JOIN pengadaan_tahapan pt ON pt.pengadaan_id = p.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);

    res.json({
      stuck_per_tahap: stuck.rows,
      avg_durasi_per_tahap: avgDurasi.rows,
      progress_items: progressItems.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil ringkasan dashboard.' });
  }
}

module.exports = { summary };
