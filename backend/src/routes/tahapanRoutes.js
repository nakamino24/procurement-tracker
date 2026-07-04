const express = require('express');
const router = express.Router();
const { updateStatus } = require('../controllers/tahapanController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);
router.put('/:id', updateStatus);

module.exports = router;
