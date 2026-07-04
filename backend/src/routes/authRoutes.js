const express = require('express');
const router = express.Router();
const { login, register } = require('../controllers/authController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.post('/login', login);
// Hanya admin yang sudah login yang boleh mendaftarkan user baru
router.post('/register', requireAuth, requireRole('admin'), register);

module.exports = router;
