// /api/files  (guide §6 Files)
const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { notImplemented } = require('../utils/http');

// TODO: res.sendFile iz config.uploadDir (path.basename zbog path traversal-a);
//       proveri da fajl pripada komponenti ulogovanog korisnika
router.get('/:filename', requireAuth, notImplemented('GET /api/files/:filename'));

module.exports = router;
