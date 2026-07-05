const express = require('express');
const router = express.Router();
const { login, register, listUsers, changePassword } = require('../controllers/authController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');

router.post('/login', loginLimiter, login);
// Hanya admin yang sudah login yang boleh mendaftarkan user baru
router.post('/register', requireAuth, requireRole('admin'), register);
// Daftar user, dipakai admin untuk dropdown assign PIC & halaman kelola akun
router.get('/users', requireAuth, requireRole('admin'), listUsers);
// Ganti password akun sendiri (admin maupun staff)
router.put('/me/password', requireAuth, changePassword);

module.exports = router;