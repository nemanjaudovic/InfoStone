// /api/submit/... i /api/submissions/...  (guide §6 Submissions)
const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { formUpload } = require('../middleware/upload');
const { notImplemented } = require('../utils/http');

// JAVNO (poziva ga forma iz iframe-a), multipart: polja + fajlovi
// TODO: validacija po component.schema, insert u {owner}_form_{index}:
//       { submittedAt, data, files: [{ field, filename, path, size }] }
//       vrati { ok, submissionId, thankYouMessage }
router.post('/submit/:componentId', formUpload.any(), notImplemented('POST /api/submit/:componentId'));

router.get('/submissions/:componentId', requireAuth, notImplemented('GET /api/submissions/:componentId'));

// ?format=csv|json
router.get('/submissions/:componentId/export', requireAuth, notImplemented('GET /api/submissions/:componentId/export'));

module.exports = router;
