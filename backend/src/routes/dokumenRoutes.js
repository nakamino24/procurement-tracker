const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/dokumenController');
const upload = require('../middleware/upload');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/pengadaan/:id/dokumen', ctrl.getByPengadaan);
router.post('/pengadaan/:id/dokumen', upload.single('file'), ctrl.upload);
router.get('/dokumen/:id/download', ctrl.download);

module.exports = router;