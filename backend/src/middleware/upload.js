// Multer konfiguracija za upload fajlova iz forme (docx, pdf, slike, max 5MB)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { config } = require('../config/env');

fs.mkdirSync(config.uploadDir, { recursive: true });

const ALLOWED = ['.pdf', '.docx', '.png', '.jpg', '.jpeg'];

const formUpload = multer({
  storage: multer.diskStorage({
    destination: config.uploadDir,
    filename: (req, file, cb) =>
      cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, ALLOWED.includes(path.extname(file.originalname).toLowerCase())),
});

// CSS upload ide u memoriju (sadrzaj se cuva u bazi, css_sources.rawCss)
const cssUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1024 * 1024 } });

module.exports = { formUpload, cssUpload };
