const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { UPLOAD_DIR } = require('../controllers/dokumenController');

// Simpan file dengan nama unik (random) di disk, supaya tidak ada
// tabrakan nama walau 2 orang upload file dengan nama yang sama persis.
// Nama asli tetap disimpan terpisah di kolom nama_file_asli.
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = crypto.randomBytes(16).toString('hex');
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB per file
});

module.exports = upload;