// /api/files  (guide §6 Files) — preuzimanje fajlova iz prijava (npr. CV)
const path = require('path');
const router = require('express').Router();
const Component = require('../models/Component');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler, HttpError } = require('../utils/http');
const { getCollection } = require('../services/dynamicCollections');
const { config } = require('../config/env');

// :filename = storedName iz submission.files. Fajl sme da preuzme samo vlasnik forme.
router.get('/:filename', requireAuth, asyncHandler(async (req, res) => {
  const storedName = path.basename(req.params.filename); // zastita od ../ (path traversal)

  const forms = await Component.find({ owner: req.user.username, type: 'form' }).lean();
  for (const form of forms) {
    const submission = await getCollection(form.collectionName).findOne({ 'files.storedName': storedName });
    if (submission) {
      const file = submission.files.find((f) => f.storedName === storedName);
      return res.download(path.join(config.uploadDir, storedName), file.filename);
    }
  }
  throw new HttpError(404, 'Fajl ne postoji');
}));

module.exports = router;
