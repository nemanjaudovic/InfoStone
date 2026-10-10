// /api/submit/... i /api/submissions/...  (guide §6 Submissions)
const fs = require('fs');
const router = require('express').Router();
const mongoose = require('mongoose');
const Component = require('../models/Component');
const { requireAuth } = require('../middleware/auth');
const { formUpload } = require('../middleware/upload');
const { asyncHandler, HttpError } = require('../utils/http');
const { getCollection } = require('../services/dynamicCollections');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Multer sa greskama kao 400 (npr. fajl veci od 5MB) umesto 500
function uploadFiles(req, res, next) {
  formUpload.any()(req, res, (err) => {
    if (!err) return next();
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Fajl je veci od 5MB' : `Upload nije uspeo: ${err.message}`;
    next(new HttpError(400, msg));
  });
}

// Brisanje uploadovanih fajlova kad prijava ne prodje (da ne ostaju na disku)
const removeFiles = (files = []) => files.forEach((f) => fs.unlink(f.path, () => {}));

/**
 * Pravi `data` i `files` iz zahteva prema component.schema.fields (guide §4.1).
 * Polja koja nisu u semi se ignorisu. Vraca { data, files, errors }.
 */
function buildSubmission(fields, body, uploaded) {
  const data = {};
  const files = [];
  const errors = {};

  for (const f of fields) {
    const label = f.label || f.name;
    const raw = body[f.name];

    if (f.type === 'file') {
      const file = uploaded.find((u) => u.fieldname === f.name);
      if (file) {
        files.push({
          field: f.name,
          filename: file.originalname,
          storedName: file.filename,
          path: `/uploads/${file.filename}`,
          size: file.size,
        });
      } else if (f.required) {
        errors[f.name] = `Prilozite fajl za "${label}" (pdf, docx, png, jpg)`;
      }
      continue;
    }

    if (f.type === 'checkbox') {
      const values = (Array.isArray(raw) ? raw : raw === undefined ? [] : [raw]).filter((v) => f.options.includes(v));
      if (f.required && values.length === 0) errors[f.name] = `Izaberite bar jednu opciju za "${label}"`;
      data[f.name] = values;
      continue;
    }

    if (f.type === 'radio') {
      const value = Array.isArray(raw) ? raw[0] : raw;
      if (value !== undefined && !f.options.includes(value)) errors[f.name] = `Neispravna opcija za "${label}"`;
      else if (f.required && value === undefined) errors[f.name] = `Izaberite opciju za "${label}"`;
      data[f.name] = value === undefined ? null : value;
      continue;
    }

    // text / textarea
    const value = String(Array.isArray(raw) ? raw[0] : raw ?? '').trim();
    if (!value) {
      if (f.required) errors[f.name] = `Polje "${label}" je obavezno`;
    } else if (f.minLength && value.length < f.minLength) {
      errors[f.name] = `"${label}": najmanje ${f.minLength} karaktera`;
    } else if (f.maxLength && value.length > f.maxLength) {
      errors[f.name] = `"${label}": najvise ${f.maxLength} karaktera`;
    } else if (f.inputType === 'email' && !EMAIL_RE.test(value)) {
      errors[f.name] = 'Neispravna email adresa';
    }
    data[f.name] = value;
  }

  return { data, files, errors };
}

// JAVNO (poziva ga forma iz iframe-a), multipart: polja + fajlovi
// -> insert u {owner}_form_{index}: { submittedAt, data, files }
// -> 201 { ok, submissionId, thankYouMessage }
router.post('/submit/:componentId', uploadFiles, asyncHandler(async (req, res) => {
  const uploaded = req.files || [];
  try {
    // Ugradjena demo forma (embed demo-form): prijava se ne cuva, samo ispisuje u terminal
    if (req.params.componentId === 'demo-form') {
      console.log('[demo-form] prijava:', req.body, uploaded.map((f) => f.originalname));
      removeFiles(uploaded);
      return res.status(201).json({ ok: true, submissionId: null, thankYouMessage: 'Hvala! (demo forma — prijava nije sacuvana)' });
    }

    if (!mongoose.isValidObjectId(req.params.componentId)) throw new HttpError(404, 'Forma ne postoji');
    const component = await Component.findById(req.params.componentId).lean();
    if (!component) throw new HttpError(404, 'Forma ne postoji');
    if (component.type !== 'form') throw new HttpError(400, 'Komponenta nije forma');
    // TODO (sensitive): zahtevati token iz /api/protected/:id/unlock

    const fields = (component.schema && component.schema.fields) || [];
    const { data, files, errors } = buildSubmission(fields, req.body, uploaded);
    if (Object.keys(errors).length) {
      const err = new HttpError(400, Object.values(errors)[0]);
      err.fields = errors;
      throw err;
    }

    // Fajlovi koji ne pripadaju nijednom file polju se brisu
    removeFiles(uploaded.filter((u) => !files.some((f) => f.storedName === u.filename)));

    const result = await getCollection(component.collectionName).insertOne({ submittedAt: new Date(), data, files });
    res.status(201).json({
      ok: true,
      submissionId: String(result.insertedId),
      thankYouMessage: (component.schema && component.schema.thankYouMessage) || 'Hvala! Vasa prijava je poslata.',
    });
  } catch (err) {
    removeFiles(uploaded);
    throw err;
  }
}));

// Komponenta ulogovanog korisnika (tipa form) ili 404
async function loadOwnedForm(req) {
  if (!mongoose.isValidObjectId(req.params.componentId)) throw new HttpError(404, 'Komponenta ne postoji');
  const component = await Component.findOne({ _id: req.params.componentId, owner: req.user.username }).lean();
  if (!component) throw new HttpError(404, 'Komponenta ne postoji');
  return component;
}

const listSubmissions = (component) =>
  getCollection(component.collectionName).find().sort({ submittedAt: -1 }).toArray();

// Prijave za dashboard (najnovije prve)
router.get('/submissions/:componentId', requireAuth, asyncHandler(async (req, res) => {
  const component = await loadOwnedForm(req);
  res.json(await listSubmissions(component));
}));

// ?format=csv|json — preuzimanje svih prijava
router.get('/submissions/:componentId/export', requireAuth, asyncHandler(async (req, res) => {
  const component = await loadOwnedForm(req);
  const rows = await listSubmissions(component);
  const format = req.query.format === 'json' ? 'json' : 'csv';
  res.attachment(`${component.collectionName}.${format}`);

  if (format === 'json') return res.json(rows);

  // CSV: kolona po polju forme + vreme prijave; fajlovi kao imena
  const fields = (component.schema && component.schema.fields) || [];
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = ['submittedAt', ...fields.map((f) => f.label || f.name)];
  const lines = rows.map((r) => [
    new Date(r.submittedAt).toISOString(),
    ...fields.map((f) => {
      if (f.type === 'file') return (r.files || []).filter((x) => x.field === f.name).map((x) => x.filename).join('; ');
      const v = r.data ? r.data[f.name] : '';
      return Array.isArray(v) ? v.join('; ') : v;
    }),
  ]);
  res.type('text/csv; charset=utf-8');
  // BOM da Excel ispravno prikaze nasa slova
  res.send('﻿' + [header, ...lines].map((l) => l.map(cell).join(',')).join('\r\n'));
}));

router.buildSubmission = buildSubmission; // izlozeno za testiranje
module.exports = router;
