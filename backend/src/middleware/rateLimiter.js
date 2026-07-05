const rateLimit = require('express-rate-limit');

// Batasi percobaan login: maksimal 5 kali gagal per 15 menit per IP.
// Ini mencegah brute-force nebak-nebak password.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.' },
});

module.exports = { loginLimiter };