const pool = require('../config/db');
const { logAudit } = require('../utils/auditLog');

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
      `SELECT pt.id, pt.status, pt.tanggal_update, pt.catatan, pt.tanggal_mulai_tahap,
              tm.id AS tahapan_master_id, tm.nama_tahap, tm.urutan, tm.target_hari,
              CASE
                WHEN pt.tanggal_mulai_tahap IS NULL THEN false
                WHEN pt.status = 'Selesai' THEN
                  EXTRACT(EPOCH FROM (pt.tanggal_update - pt.tanggal_mulai_tahap)) / 86400 > tm.target_hari
                WHEN pt.status IN ('Proses', 'Tertunda') THEN
                  EXTRACT(EPOCH FROM (now() - pt.tanggal_mulai_tahap)) / 86400 > tm.target_hari
                ELSE false
              END AS is_overdue
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
    await logAudit(rows[0].id, req.user.id, 'Membuat pengadaan', `Nama: ${nama_pengadaan}, PIC: ${picUser.rows[0]?.nama || '-'}`);
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
    const perubahan = Object.entries({ nama_pengadaan, vendor, nilai_kontrak, pic_user_id, tanggal_mulai })
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k]) => k)
      .join(', ');
    await logAudit(id, req.user.id, 'Mengubah data pengadaan', perubahan ? `Field: ${perubahan}` : null);
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

// Helper: tambahkan 1 tahap kondisional (kalau belum ada) berdasarkan kode-nya
async function ensureStage(pengadaanId, kode) {
  await pool.query(
    `INSERT INTO pengadaan_tahapan (pengadaan_id, tahapan_master_id, status)
     SELECT $1, tm.id, 'Belum Mulai' FROM tahapan_master tm WHERE tm.kode = $2
     ON CONFLICT (pengadaan_id, tahapan_master_id) DO NOTHING`,
    [pengadaanId, kode]
  );
}

// Helper: hapus 1 tahap kondisional, TAPI cuma kalau statusnya masih
// "Belum Mulai" -- supaya nggak menghapus progress yang sudah dikerjakan
// kalau ternyata PIC ganti-ganti pilihan metode.
async function removeStageIfUntouched(pengadaanId, kode) {
  await pool.query(
    `DELETE FROM pengadaan_tahapan pt
     USING tahapan_master tm
     WHERE pt.tahapan_master_id = tm.id AND tm.kode = $2
       AND pt.pengadaan_id = $1 AND pt.status = 'Belum Mulai'`,
    [pengadaanId, kode]
  );
}

// PUT /api/pengadaan/:id/metode
// Menyimpan metode pengadaan/penilaian/kategori putusan/toggle SPK, LALU
// otomatis menyesuaikan tahap mana yang relevan buat pengadaan ini:
// - Tender Umum/Terbatas -> tambah tahap "Surat Pengumuman Pemenang"
// - Penunjukan Langsung  -> tahap itu dihapus (kalau belum dikerjakan)
// - Sistem Nilai         -> tambah "Penggabungan Nilai", hapus "Auction"
// - Evaluasi Biaya Terendah -> kebalikannya
// - pakai_spk toggle     -> tambah/hapus tahap "Surat Perintah Kerja"
async function updateMetode(req, res) {
  const { id } = req.params;
  const { metode_pengadaan, aspek_positif_pl, aspek_negatif_pl, metode_penilaian, kategori_putusan, pakai_spk } = req.body;

  try {
    const check = await pool.query('SELECT pic_user_id FROM pengadaan WHERE id = $1', [id]);
    if (!check.rows[0]) return res.status(404).json({ message: 'Pengadaan tidak ditemukan.' });
    if (req.user.role === 'staff' && check.rows[0].pic_user_id !== req.user.id) {
      return res.status(403).json({ message: 'Kamu tidak punya akses untuk mengubah pengadaan ini.' });
    }

    const { rows } = await pool.query(
      `UPDATE pengadaan SET
        metode_pengadaan = COALESCE($1, metode_pengadaan),
        aspek_positif_pl = COALESCE($2, aspek_positif_pl),
        aspek_negatif_pl = COALESCE($3, aspek_negatif_pl),
        metode_penilaian = COALESCE($4, metode_penilaian),
        kategori_putusan = COALESCE($5, kategori_putusan),
        pakai_spk = COALESCE($6, pakai_spk),
        updated_at = now()
       WHERE id = $7 RETURNING *`,
      [metode_pengadaan, aspek_positif_pl, aspek_negatif_pl, metode_penilaian, kategori_putusan, pakai_spk, id]
    );
    const updated = rows[0];

    if (updated.metode_pengadaan === 'Tender Umum' || updated.metode_pengadaan === 'Tender Terbatas') {
      await ensureStage(id, 'pengumuman_pemenang');
    } else if (updated.metode_pengadaan === 'Penunjukan Langsung') {
      await removeStageIfUntouched(id, 'pengumuman_pemenang');
    }

    if (updated.metode_penilaian === 'Sistem Nilai') {
      await ensureStage(id, 'penggabungan_nilai');
      await removeStageIfUntouched(id, 'auction');
    } else if (updated.metode_penilaian === 'Evaluasi Biaya Terendah') {
      await ensureStage(id, 'auction');
      await removeStageIfUntouched(id, 'penggabungan_nilai');
    }

    if (updated.pakai_spk) {
      await ensureStage(id, 'surat_perintah_kerja');
    } else {
      await removeStageIfUntouched(id, 'surat_perintah_kerja');
    }

    // Due-diligence khusus jalur Komite (Background Checking, PEP, Opini
    // Legal, Opini Compliance, Opini SORH). Non-komite (GH+GH / DH+GH)
    // tidak butuh ini.
    const KOMITE_CHECKS = ['background_checking', 'pep', 'opini_legal', 'opini_compliance', 'opini_sorh'];
    const isKomite = ['Komite 1', 'Komite 2', 'Komite 3', 'Komite 4'].includes(updated.kategori_putusan);
    if (isKomite) {
      for (const kode of KOMITE_CHECKS) await ensureStage(id, kode);
    } else if (updated.kategori_putusan) {
      // kategori_putusan sudah diisi TAPI bukan komite (berarti GH+GH/DH+GH)
      for (const kode of KOMITE_CHECKS) await removeStageIfUntouched(id, kode);
    }

    // Uji Kepatuhan cuma untuk Komite 1 & 2 secara spesifik
    if (['Komite 1', 'Komite 2'].includes(updated.kategori_putusan)) {
      await ensureStage(id, 'uji_kepatuhan');
    } else if (updated.kategori_putusan) {
      await removeStageIfUntouched(id, 'uji_kepatuhan');
    }

    await logAudit(
      id, req.user.id, 'Mengubah metode pengadaan',
      `Metode: ${updated.metode_pengadaan || '-'}, Penilaian: ${updated.metode_penilaian || '-'}, Kategori Putusan: ${updated.kategori_putusan || '-'}, Pakai SPK: ${updated.pakai_spk}`
    );

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal update metode pengadaan.' });
  }
}

// GET /api/pengadaan/:id/audit -> histori lengkap perubahan pengadaan ini
async function getAudit(req, res) {
  const { id } = req.params;
  try {
    const check = await pool.query('SELECT pic_user_id FROM pengadaan WHERE id = $1', [id]);
    if (!check.rows[0]) return res.status(404).json({ message: 'Pengadaan tidak ditemukan.' });
    if (req.user.role === 'staff' && check.rows[0].pic_user_id !== req.user.id) {
      return res.status(403).json({ message: 'Kamu tidak punya akses ke pengadaan ini.' });
    }
    const { rows } = await pool.query(
      `SELECT a.id, a.aksi, a.detail, a.created_at, u.nama AS user_nama
       FROM audit_log a
       LEFT JOIN users u ON u.id = a.user_id
       WHERE a.pengadaan_id = $1
       ORDER BY a.created_at DESC`,
      [id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil riwayat perubahan.' });
  }
}

module.exports = { getAll, getById, create, update, remove, updateMetode, getAudit };