// /api/submit/... i /api/submissions/...  (guide §6 Submissions)
const fs = require('fs');
const router = require('express').Router();
const mongoose = require('mongoose');
const Component = require('../models/Component');
const { requireAuth } = require('../middleware/auth');
const { formUpload } = require('../middleware/upload');
const { asyncHandler, HttpError } = require('../utils/http');
const { getCollection } = require('../services/dynamicCollections');
const { promptLimiter } = require('../middleware/rateLimit');
const aiClient = require('../services/aiClient');
const { config } = require('../config/env');

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

// ============================================================================
// Tabela + chatbox (stranica Table u dashboard-u)
// Prompt organizatora + redovi tabele -> Gemma (ai/: /api/screen-candidates-batch)
// -> svaki red dobija ocenu { match_score, meets_criteria, summary, key_highlights }
// ============================================================================

const ASK_DEFAULT_ROWS = 10;
const ASK_MAX_ROWS = 30; // Gemma obradjuje red po red (~10-20s po redu) -> ogranicenje zbog timeout-a

// Jedinstvene labele kolona: q1 -> "Ime"; duplikat labele -> "Ime (q3)"
function fieldLabels(fields) {
  const seen = new Set();
  const labels = {};
  for (const f of fields) {
    let label = String(f.label || f.name).trim() || f.name;
    if (seen.has(label)) label = `${label} (${f.name})`;
    seen.add(label);
    labels[f.name] = label;
  }
  return labels;
}

/**
 * Red iz Mongo-a -> kandidat za ai/ screener:
 *  - data: kljucevi su LABELE (Gemma vidi "Fakultet: ETF", ne "q3: ETF")
 *  - files: prvi PDF iz file polja kao field "cv" + storedName (tako ga ai/ pronalazi u uploads/)
 */
function toCandidate(row, fields, labels) {
  const data = {};
  for (const f of fields) {
    if (f.type === 'file') continue;
    const v = row.data ? row.data[f.name] : undefined;
    data[labels[f.name]] = Array.isArray(v) ? v.join(', ') : v ?? '';
  }
  const fileFieldNames = fields.filter((f) => f.type === 'file').map((f) => f.name);
  const pdf = (row.files || []).find((x) => fileFieldNames.includes(x.field) && /\.pdf$/i.test(x.storedName || ''));
  return {
    _id: String(row._id),
    submittedAt: row.submittedAt instanceof Date ? row.submittedAt.toISOString() : row.submittedAt,
    data,
    files: pdf ? [{ field: 'cv', filename: pdf.storedName, path: pdf.path, size: pdf.size }] : [],
  };
}

// Body: { prompt, maxRows? } -> { prompt, total, processed, matched, results: [{ submission, evaluation }] }
router.post('/submissions/:componentId/ask', requireAuth, promptLimiter, asyncHandler(async (req, res) => {
  const component = await loadOwnedForm(req);
  if (component.type !== 'form') throw new HttpError(400, 'Chatbox radi samo nad tabelama formi');

  const prompt = String(req.body.prompt || '').trim();
  if (!prompt) throw new HttpError(400, 'Upisi pitanje / kriterijum');
  if (prompt.length > 500) throw new HttpError(400, 'Prompt moze imati najvise 500 karaktera');
  const maxRows = Math.min(Math.max(Number(req.body.maxRows) || ASK_DEFAULT_ROWS, 1), ASK_MAX_ROWS);

  const all = await listSubmissions(component); // najnovije prve
  const rows = all.slice(0, maxRows);
  if (!rows.length) {
    return res.json({ prompt, total: 0, processed: 0, matched: 0, results: [] });
  }

  const fields = (component.schema && component.schema.fields) || [];
  const labels = fieldLabels(fields);
  const candidates = rows.map((r) => toCandidate(r, fields, labels));

  let result;
  const started = Date.now();
  try {
    result = await aiClient.screenCandidates(candidates, prompt, config.uploadDir);
  } catch (err) {
    const timedOut = err.name === 'TimeoutError' || err.name === 'AbortError';
    throw new HttpError(timedOut ? 504 : 502, timedOut
      ? 'Gemma nije stigla da obradi sve redove na vreme. Probaj sa manje redova.'
      : `AI servis nije uspeo: ${err.message}`);
  }
  console.log(`[ask] ${rows.length} redova obradjeno za ${((Date.now() - started) / 1000).toFixed(1)}s`);

  // Spoji ocene nazad sa originalnim redovima (po _id)
  const byId = new Map(rows.map((r) => [String(r._id), r]));
  const results = ((result && result.results) || [])
    .filter((c) => byId.has(String(c._id)))
    .map((c) => ({
      submission: byId.get(String(c._id)),
      evaluation: {
        matchScore: Number(c.evaluation && c.evaluation.match_score) || 0,
        meetsCriteria: !!(c.evaluation && c.evaluation.meets_criteria),
        summary: (c.evaluation && c.evaluation.summary) || '',
        keyHighlights: (c.evaluation && c.evaluation.key_highlights) || [],
      },
    }))
    .sort((a, b) => b.evaluation.matchScore - a.evaluation.matchScore);

  res.json({
    prompt,
    total: all.length,
    processed: rows.length,
    matched: results.filter((r) => r.evaluation.meetsCriteria).length,
    results,
  });
}));

router.buildSubmission = buildSubmission; // izlozeno za testiranje
module.exports = router;
