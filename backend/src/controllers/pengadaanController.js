const pool = require('../config/db');

// GET /api/pengadaan?status=Proses&vendor=abc&pic=budi&search=laptop
// Filter bersifat opsional & bisa digabung. `search` mencari di nama_pengadaan.
// Kalau yang login role "staff", otomatis dibatasi hanya lihat pengadaan
// yang pic_user_id-nya = dirinya sendiri. Admin bebas lihat semua.
async function getAll(req, res) {
  const { status, vendor, pic, search } = req.query;
  const conditions = [];
  const values = [];
  let i = 1;

  let baseQuery = `
    SELECT p.*, u.nama AS pic_nama,
      COALESCE(
        ROUND(100.0 * COUNT(*) FILTER (WHERE pt.status = 'Selesai') / NULLIF(COUNT(*), 0)),
        0
      ) AS progress_percent,
      (
        SELECT tm.nama_tahap FROM pengadaan_tahapan pt2
        JOIN tahapan_master tm ON tm.id = pt2.tahapan_master_id
        WHERE pt2.pengadaan_id = p.id AND pt2.status != 'Selesai'
        ORDER BY tm.urutan ASC LIMIT 1
      ) AS tahap_saat_ini
    FROM pengadaan p
    LEFT JOIN pengadaan_tahapan pt ON pt.pengadaan_id = p.id
    LEFT JOIN users u ON u.id = p.pic_user_id
  `;

  if (req.user.role === 'staff') {
    conditions.push(`p.pic_user_id = $${i++}`);
    values.push(req.user.id);
  }
  if (vendor) { conditions.push(`p.vendor ILIKE $${i++}`); values.push(`%${vendor}%`); }
  if (pic) { conditions.push(`u.nama ILIKE $${i++}`); values.push(`%${pic}%`); }
  if (search) { conditions.push(`p.nama_pengadaan ILIKE $${i++}`); values.push(`%${search}%`); }
  if (status) {
    // filter: pengadaan yang PUNYA minimal satu tahap dengan status ini
    conditions.push(`p.id IN (SELECT pengadaan_id FROM pengadaan_tahapan WHERE status = $${i++})`);
    values.push(status);
  }

  if (conditions.length) baseQuery += ' WHERE ' + conditions.join(' AND ');
  baseQuery += ' GROUP BY p.id, u.nama ORDER BY p.created_at DESC';

  try {
    const { rows } = await pool.query(baseQuery, values);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil data pengadaan.' });
  }
}

// GET /api/pengadaan/:id  -> detail + semua tahapannya (urut)
async function getById(req, res) {
  const { id } = req.params;
  try {
    const pengadaan = await pool.query(
      `SELECT p.*, u.nama AS pic_nama FROM pengadaan p
       LEFT JOIN users u ON u.id = p.pic_user_id
       WHERE p.id = $1`,
      [id]
    );
    if (!pengadaan.rows[0]) return res.status(404).json({ message: 'Pengadaan tidak ditemukan.' });

    // Staff cuma boleh buka detail pengadaan miliknya sendiri
    if (req.user.role === 'staff' && pengadaan.rows[0].pic_user_id !== req.user.id) {
      return res.status(403).json({ message: 'Kamu tidak punya akses ke pengadaan ini.' });
    }

    const tahapan = await pool.query(
      `SELECT pt.id, pt.status, pt.tanggal_update, pt.catatan,
              tm.id AS tahapan_master_id, tm.nama_tahap, tm.urutan
       FROM pengadaan_tahapan pt
       JOIN tahapan_master tm ON tm.id = pt.tahapan_master_id
       WHERE pt.pengadaan_id = $1
       ORDER BY tm.urutan ASC`,
      [id]
    );

    res.json({ ...pengadaan.rows[0], tahapan: tahapan.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil detail pengadaan.' });
  }
}

// POST /api/pengadaan  -> trigger fn_generate_tahapan otomatis membuat 9 baris tahapan
// Kalau yang input staff, PIC otomatis diri sendiri. Kalau admin, wajib pilih PIC.
async function create(req, res) {
  const { nama_pengadaan, vendor, nilai_kontrak, pic_user_id, tanggal_mulai } = req.body;
  if (!nama_pengadaan) return res.status(400).json({ message: 'Nama pengadaan wajib diisi.' });

  const assignedPicId = req.user.role === 'staff' ? req.user.id : pic_user_id;
  if (!assignedPicId) return res.status(400).json({ message: 'PIC wajib dipilih.' });

  try {
    const picUser = await pool.query('SELECT nama FROM users WHERE id = $1', [assignedPicId]);
    const { rows } = await pool.query(
      `INSERT INTO pengadaan (nama_pengadaan, vendor, nilai_kontrak, pic, pic_user_id, tanggal_mulai, created_by)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, CURRENT_DATE), $7) RETURNING *`,
      [nama_pengadaan, vendor, nilai_kontrak || 0, picUser.rows[0]?.nama || null, assignedPicId, tanggal_mulai, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal membuat pengadaan.' });
  }
}

// PUT /api/pengadaan/:id
async function update(req, res) {
  const { id } = req.params;
  const { nama_pengadaan, vendor, nilai_kontrak, pic_user_id, tanggal_mulai } = req.body;

  if (req.user.role === 'staff') {
    const check = await pool.query('SELECT pic_user_id FROM pengadaan WHERE id = $1', [id]);
    if (!check.rows[0]) return res.status(404).json({ message: 'Pengadaan tidak ditemukan.' });
    if (check.rows[0].pic_user_id !== req.user.id) {
      return res.status(403).json({ message: 'Kamu tidak punya akses untuk mengubah pengadaan ini.' });
    }
  }

  try {
    let picNama = null;
    if (pic_user_id) {
      const picUser = await pool.query('SELECT nama FROM users WHERE id = $1', [pic_user_id]);
      picNama = picUser.rows[0]?.nama || null;
    }
    const { rows } = await pool.query(
      `UPDATE pengadaan SET
        nama_pengadaan = COALESCE($1, nama_pengadaan),
        vendor = COALESCE($2, vendor),
        nilai_kontrak = COALESCE($3, nilai_kontrak),
        pic_user_id = COALESCE($4, pic_user_id),
        pic = COALESCE($5, pic),
        tanggal_mulai = COALESCE($6, tanggal_mulai),
        updated_at = now()
       WHERE id = $7 RETURNING *`,
      [nama_pengadaan, vendor, nilai_kontrak, pic_user_id, picNama, tanggal_mulai, id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Pengadaan tidak ditemukan.' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengupdate pengadaan.' });
  }
}

// DELETE /api/pengadaan/:id  -> ON DELETE CASCADE otomatis hapus tahapannya juga
async function remove(req, res) {
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query('DELETE FROM pengadaan WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ message: 'Pengadaan tidak ditemukan.' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal menghapus pengadaan.' });
  }
}

module.exports = { getAll, getById, create, update, remove };
