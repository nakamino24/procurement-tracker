const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/pengadaanController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth); // semua endpoint di bawah ini wajib login

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create); // admin & staff boleh input pengadaan
router.put('/:id', ctrl.update);
router.delete('/:id', requireRole('admin'), ctrl.remove); // hapus khusus admin

module.exports = router;
