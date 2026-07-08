const path = require('path');
const fs = require('fs');
const pool = require('../config/db');
const { logAudit } = require('../utils/auditLog');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const KODE_KERAHASIAAN_VALID = ['B', 'R', 'SR'];

// Ambil & naikkan nomor urut tahun berjalan secara ATOMIC (pakai UPSERT +
// RETURNING dalam 1 statement), supaya aman kalau 2 orang upload bersamaan
// -- tidak akan pernah keluar nomor kembar.
async function ambilNomorUrut(tahun) {
  const { rows } = await pool.query(
    `INSERT INTO nomor_counter (tahun, counter) VALUES ($1, 1)
     ON CONFLICT (tahun) DO UPDATE SET counter = nomor_counter.counter + 1
     RETURNING counter`,
    [tahun]
  );
  return rows[0].counter;
}

// POST /api/pengadaan/:id/dokumen  (multipart/form-data: file, kode_kerahasiaan, pengadaan_tahapan_id?)
async function upload(req, res) {
  const { id } = req.params; // pengadaan_id
  const { kode_kerahasiaan, pengadaan_tahapan_id } = req.body;

  if (!req.file) return res.status(400).json({ message: 'File wajib diupload.' });
  if (!KODE_KERAHASIAAN_VALID.includes(kode_kerahasiaan)) {
    fs.unlinkSync(req.file.path); // buang file yang sudah kepalang keupload
    return res.status(400).json({ message: 'Kode kerahasiaan harus B, R, atau SR.' });
  }

  try {
    const pengadaan = await pool.query('SELECT pic_user_id FROM pengadaan WHERE id = $1', [id]);
    if (!pengadaan.rows[0]) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Pengadaan tidak ditemukan.' });
    }
    if (req.user.role === 'staff' && pengadaan.rows[0].pic_user_id !== req.user.id) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ message: 'Kamu tidak punya akses ke pengadaan ini.' });
    }

    // Kode "Tim" diambil dari profil PIC yang login. Kalau belum diisi
    // admin di akunnya, pakai "-" biar tetap jalan (bisa dilengkapi belakangan).
    const userRow = await pool.query('SELECT tim FROM users WHERE id = $1', [req.user.id]);
    const kodeTim = userRow.rows[0]?.tim || '-';

    const now = new Date();
    const tahun = now.getFullYear();
    const bulan = String(now.getMonth() + 1).padStart(2, '0');
    const nomorUrut = await ambilNomorUrut(tahun);

    const kodeDepartemen = process.env.DOC_KODE_DEPARTEMEN || 'e-PRG';
    const kodeGroup = process.env.DOC_KODE_GROUP || 'IPC';

    const nomorDokumen = `${kode_kerahasiaan}.${nomorUrut}.${kodeDepartemen}/${kodeGroup}/${kodeTim}/${bulan}/${tahun}`;

    const { rows } = await pool.query(
      `INSERT INTO dokumen
        (pengadaan_id, pengadaan_tahapan_id, nomor_dokumen, kode_kerahasiaan, kode_departemen, kode_group, kode_tim,
         nama_file_asli, nama_file_simpan, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        id, pengadaan_tahapan_id || null, nomorDokumen, kode_kerahasiaan, kodeDepartemen, kodeGroup, kodeTim,
        req.file.originalname, req.file.filename, req.user.id,
      ]
    );

    await logAudit(id, req.user.id, 'Upload dokumen', `${nomorDokumen} — ${req.file.originalname}`);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: 'Gagal upload dokumen.' });
  }
}

// GET /api/pengadaan/:id/dokumen
async function getByPengadaan(req, res) {
  const { id } = req.params;
  try {
    const check = await pool.query('SELECT pic_user_id FROM pengadaan WHERE id = $1', [id]);
    if (!check.rows[0]) return res.status(404).json({ message: 'Pengadaan tidak ditemukan.' });
    if (req.user.role === 'staff' && check.rows[0].pic_user_id !== req.user.id) {
      return res.status(403).json({ message: 'Kamu tidak punya akses ke pengadaan ini.' });
    }
    const { rows } = await pool.query(
      `SELECT d.*, u.nama AS uploaded_by_nama
       FROM dokumen d LEFT JOIN users u ON u.id = d.uploaded_by
       WHERE d.pengadaan_id = $1 ORDER BY d.created_at DESC`,
      [id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil daftar dokumen.' });
  }
}

// GET /api/dokumen/:id/download
async function download(req, res) {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT d.*, p.pic_user_id FROM dokumen d JOIN pengadaan p ON p.id = d.pengadaan_id WHERE d.id = $1`,
      [id]
    );
    const dok = rows[0];
    if (!dok) return res.status(404).json({ message: 'Dokumen tidak ditemukan.' });
    if (req.user.role === 'staff' && dok.pic_user_id !== req.user.id) {
      return res.status(403).json({ message: 'Kamu tidak punya akses ke dokumen ini.' });
    }
    const filePath = path.join(UPLOAD_DIR, dok.nama_file_simpan);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File fisik tidak ditemukan di server.' });
    res.download(filePath, dok.nama_file_asli);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengunduh dokumen.' });
  }
}

module.exports = { upload, getByPengadaan, download, UPLOAD_DIR };