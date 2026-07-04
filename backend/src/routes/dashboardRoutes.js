const express = require('express');
const router = express.Router();
const { summary } = require('../controllers/dashboardController');
const { exportExcel, exportPdf } = require('../utils/export');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);
router.get('/summary', summary);
router.get('/export/excel', exportExcel);
router.get('/export/pdf', exportPdf);

module.exports = router;
