// /api/protected  (guide §3.3 Sensitive)
const router = require('express').Router();
const { notImplemented } = require('../utils/http');

// Body: { password } -> bcrypt.compare sa component.passwordHash -> kratkotrajni JWT { componentId }
router.post('/:componentId/unlock', notImplemented('POST /api/protected/:componentId/unlock'));

// ?token=... -> HTML/JSON sadrzaj komponente
router.get('/:componentId/content', notImplemented('GET /api/protected/:componentId/content'));

module.exports = router;
