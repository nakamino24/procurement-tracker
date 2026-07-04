const jwt = require('jsonwebtoken');

// Mengecek header "Authorization: Bearer <token>" di setiap request
// ke endpoint yang dilindungi. Kalau valid, data user disisipkan ke
// req.user supaya controller berikutnya tahu siapa yang request.
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token tidak ditemukan.' });
  }
  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token tidak valid atau kedaluwarsa.' });
  }
}

// Membatasi endpoint tertentu hanya untuk role tertentu, misal admin.
// Contoh pemakaian: router.post('/', requireAuth, requireRole('admin'), ...)
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Kamu tidak punya akses untuk aksi ini.' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
