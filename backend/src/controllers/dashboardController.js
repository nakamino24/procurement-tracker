const pool = require('../config/db');

// GET /api/dashboard/summary
// Mengembalikan beberapa potongan data sekaligus untuk dashboard:
// 1. stuck_per_tahap: berapa pengadaan yang "stuck" (belum Selesai) di tiap tahap
// 2. avg_durasi_per_tahap: rata-rata hari dari tanggal_update tahap sebelumnya
//    ke tahap ini (proxy sederhana durasi pengerjaan tiap tahap)
// 3. progress_items: progress % tiap pengadaan (dipakai buat progress bar)
// 4. status_distribution: jumlah tahap per status (untuk donut chart)
// 5. trend_bulanan: jumlah pengadaan dibuat vs selesai per bulan, 6 bulan terakhir (untuk line/bar chart)
// 6. activity_feed: histori update status tahap terbaru (untuk feed aktivitas)
async function summary(req, res) {
  const isStaff = req.user.role === 'staff';
  try {
    const stuck = await pool.query(`
      SELECT tm.nama_tahap, tm.urutan, COUNT(*) AS jumlah_stuck
      FROM pengadaan_tahapan pt
      JOIN tahapan_master tm ON tm.id = pt.tahapan_master_id
      JOIN pengadaan p ON p.id = pt.pengadaan_id
      WHERE pt.status IN ('Proses', 'Tertunda') ${isStaff ? 'AND p.pic_user_id = $1' : ''}
      GROUP BY tm.nama_tahap, tm.urutan
      ORDER BY tm.urutan
    `, isStaff ? [req.user.id] : []);

    const avgDurasi = await pool.query(`
      SELECT tm.nama_tahap, tm.urutan,
        ROUND(AVG(EXTRACT(EPOCH FROM (pt.tanggal_update - prev.tanggal_update)) / 86400)::numeric, 1) AS rata_rata_hari
      FROM pengadaan_tahapan pt
      JOIN tahapan_master tm ON tm.id = pt.tahapan_master_id
      JOIN pengadaan p ON p.id = pt.pengadaan_id
      LEFT JOIN pengadaan_tahapan prev
        ON prev.pengadaan_id = pt.pengadaan_id
        AND prev.tahapan_master_id IN (
          SELECT id FROM tahapan_master WHERE urutan = tm.urutan - 1
        )
      WHERE pt.status = 'Selesai' AND prev.status = 'Selesai' ${isStaff ? 'AND p.pic_user_id = $1' : ''}
      GROUP BY tm.nama_tahap, tm.urutan
      ORDER BY tm.urutan
    `, isStaff ? [req.user.id] : []);

    const progressItems = await pool.query(`
      SELECT p.id, p.nama_pengadaan, p.vendor, p.pic,
        COALESCE(ROUND(100.0 * COUNT(*) FILTER (WHERE pt.status = 'Selesai') / NULLIF(COUNT(*), 0)), 0) AS progress_percent
      FROM pengadaan p
      LEFT JOIN pengadaan_tahapan pt ON pt.pengadaan_id = p.id
      ${isStaff ? 'WHERE p.pic_user_id = $1' : ''}
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `, isStaff ? [req.user.id] : []);

    // Distribusi status semua tahapan (buat donut chart)
    const statusDistribution = await pool.query(`
      SELECT pt.status, COUNT(*) AS jumlah
      FROM pengadaan_tahapan pt
      JOIN pengadaan p ON p.id = pt.pengadaan_id
      ${isStaff ? 'WHERE p.pic_user_id = $1' : ''}
      GROUP BY pt.status
    `, isStaff ? [req.user.id] : []);

    // Trend 6 bulan terakhir: pengadaan dibuat vs pengadaan yang SEMUA tahapnya sudah Selesai
    const trend = await pool.query(`
      WITH bulan AS (
        SELECT to_char(d, 'YYYY-MM') AS periode
        FROM generate_series(date_trunc('month', now()) - interval '5 months', date_trunc('month', now()), interval '1 month') d
      ),
      dibuat AS (
        SELECT to_char(date_trunc('month', p.created_at), 'YYYY-MM') AS periode, COUNT(*) AS jumlah
        FROM pengadaan p
        WHERE p.created_at >= date_trunc('month', now()) - interval '5 months'
        ${isStaff ? 'AND p.pic_user_id = $1' : ''}
        GROUP BY 1
      ),
      selesai AS (
        SELECT periode, COUNT(*) AS jumlah FROM (
          SELECT p.id, to_char(date_trunc('month', MAX(pt.tanggal_update)), 'YYYY-MM') AS periode
          FROM pengadaan p
          JOIN pengadaan_tahapan pt ON pt.pengadaan_id = p.id
          ${isStaff ? 'WHERE p.pic_user_id = $1' : ''}
          GROUP BY p.id
          HAVING COUNT(*) FILTER (WHERE pt.status != 'Selesai') = 0
        ) sub
        WHERE periode >= to_char(date_trunc('month', now()) - interval '5 months', 'YYYY-MM')
        GROUP BY periode
      )
      SELECT bulan.periode,
        COALESCE(dibuat.jumlah, 0) AS dibuat,
        COALESCE(selesai.jumlah, 0) AS selesai
      FROM bulan
      LEFT JOIN dibuat ON dibuat.periode = bulan.periode
      LEFT JOIN selesai ON selesai.periode = bulan.periode
      ORDER BY bulan.periode
    `, isStaff ? [req.user.id] : []);

    // Activity feed: histori update tahap terbaru (siapa, apa, kapan)
    const activity = await pool.query(`
      SELECT pt.id, pt.status, pt.tanggal_update, pt.catatan,
        p.id AS pengadaan_id, p.nama_pengadaan,
        tm.nama_tahap,
        u.nama AS updated_by_nama
      FROM pengadaan_tahapan pt
      JOIN pengadaan p ON p.id = pt.pengadaan_id
      JOIN tahapan_master tm ON tm.id = pt.tahapan_master_id
      LEFT JOIN users u ON u.id = pt.updated_by
      WHERE pt.tanggal_update IS NOT NULL ${isStaff ? 'AND p.pic_user_id = $1' : ''}
      ORDER BY pt.tanggal_update DESC
      LIMIT 15
    `, isStaff ? [req.user.id] : []);

    res.json({
      stuck_per_tahap: stuck.rows,
      avg_durasi_per_tahap: avgDurasi.rows,
      progress_items: progressItems.rows,
      status_distribution: statusDistribution.rows,
      trend_bulanan: trend.rows,
      activity_feed: activity.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil ringkasan dashboard.' });
  }
}

module.exports = { summary };