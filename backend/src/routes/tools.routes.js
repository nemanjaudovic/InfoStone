// /api/tools — AI alati za organizatora (dokument "AI ideje za dogadjaje", deo "Ideje za dogadjaje")
// + dev alati: pregled tabela (kolekcija) i upitna konzola (phpMyAdmin stil)
const router = require('express').Router();
const mongoose = require('mongoose');
const { requireAuth } = require('../middleware/auth');
const { promptLimiter } = require('../middleware/rateLimit');
const { asyncHandler, HttpError, notImplemented } = require('../utils/http');
const { assertSafeQuery, assertSafePipeline } = require('../services/mongoWhitelist');

// ============================================================================
// Dev alati: Tables + Query (Rute su PRE globalnog router.use,
// da ih promptLimiter (rezervisan za AI pozive) ne ogranicava na 10/min.)
// ============================================================================

const TABLE_NAME_RE = /^[A-Za-z0-9_]+$/;
const MAX_ROWS = 500;

// Sistemske kolekcije aplikacije — Drop Table na njih nije dozvoljen
const PROTECTED_TABLES = new Set(['users', 'components', 'css_sources', 'search_history']);

async function findCollection(db, name) {
  const colls = await db.listCollections({ name }).toArray();
  if (!colls.length) throw new HttpError(404, `Kolekcija "${name}" ne postoji`);
  return db.collection(name);
}

// Lista svih kolekcija sa brojem dokumenata
router.get('/tables', requireAuth, asyncHandler(async (req, res) => {
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  const tables = await Promise.all(
    collections
      .filter((c) => !c.name.startsWith('system.'))
      .map(async (c) => ({
        name: c.name,
        count: await db.collection(c.name).estimatedDocumentCount(),
      }))
  );
  tables.sort((a, b) => a.name.localeCompare(b.name));
  res.json(tables);
}));

// Redovi jedne kolekcije (ako postoji submittedAt — najnoviji prvi; do 200 redova)
router.get('/tables/:name', requireAuth, asyncHandler(async (req, res) => {
  const name = String(req.params.name);
  if (!TABLE_NAME_RE.test(name)) throw new HttpError(400, 'Neispravno ime kolekcije');
  const db = mongoose.connection.db;
  const coll = await findCollection(db, name);
  const count = await coll.estimatedDocumentCount();
  const rows = await coll.find().sort({ submittedAt: -1 }).limit(200).toArray();
  res.json({ name, count, returned: rows.length, rows });
}));

// Obrisi kolekciju (Drop Table) — sistemske kolekcije su zasticene
router.delete('/tables/:name', requireAuth, asyncHandler(async (req, res) => {
  const name = String(req.params.name);
  if (!TABLE_NAME_RE.test(name)) throw new HttpError(400, 'Neispravno ime kolekcije');
  if (PROTECTED_TABLES.has(name)) {
    throw new HttpError(403, `Kolekcija "${name}" je sistemska i ne sme se obrisati.`);
  }
  const db = mongoose.connection.db;
  const coll = await findCollection(db, name);
  await coll.drop();
  res.json({ ok: true, dropped: name });
}));

// Upitna konzola. Body: { collection, mode: 'find'|'aggregate', query }
// find:      query = { filter, sort, project, limit }   (filter ide kroz whitelist)
// aggregate: query = niz stage-ova                      (ide kroz whitelist stage-ova)
router.post('/query', requireAuth, asyncHandler(async (req, res) => {
  const { collection, mode, query } = req.body || {};
  if (!collection || !TABLE_NAME_RE.test(String(collection))) {
    throw new HttpError(400, 'Izaberi kolekciju za upit');
  }
  const db = mongoose.connection.db;
  const coll = await findCollection(db, String(collection));

  const started = process.hrtime.bigint();
  let rows;
  let matched;

  if (mode === 'aggregate') {
    assertSafePipeline(query);
    rows = await coll.aggregate(query).toArray();
    matched = rows.length;
  } else {
    const q = query && typeof query === 'object' ? query : {};
    const filter = q.filter && typeof q.filter === 'object' ? q.filter : {};
    assertSafeQuery(filter);
    let cursor = coll.find(filter);
    if (q.sort && typeof q.sort === 'object') cursor = cursor.sort(q.sort);
    if (q.project && typeof q.project === 'object') cursor = cursor.project(q.project);
    const limit = Math.min(Math.max(Number(q.limit) || 200, 1), MAX_ROWS);
    rows = await cursor.limit(limit).toArray();
    matched = await coll.countDocuments(filter);
  }

  const durationMs = Math.round((Number(process.hrtime.bigint() - started) / 1e6) * 10) / 10;
  res.json({ collection: String(collection), matched, returned: rows.length, durationMs, rows });
}));

// ============================================================================
// AI alati (rate limitovani)
// ============================================================================

router.use(requireAuth, promptLimiter);

// Marketinski sadrzaj. Body: { notes, channels: ["linkedin","instagram","newsletter","session_description"] }
router.post('/marketing', notImplemented('POST /api/tools/marketing'));

// Analiza povratnih informacija nad odgovorima iz feedback forme
// -> { satisfactionScore, summary, alerts: [{ topic, message, severity }], highlights }
router.post('/feedback/:componentId', notImplemented('POST /api/tools/feedback/:componentId'));

// Preporuka agende i networking (NICE). Body: { sessions, interestsField }
router.post('/agenda/:componentId', notImplemented('POST /api/tools/agenda/:componentId'));

// Cet-bot za ucesnike (FAQ i logistika). Body: { faq, schedule, question }
// Za sada test iz dashboard-a; embed kao 5. tip komponente je odluka za kasnije.
router.post('/faq-chat', notImplemented('POST /api/tools/faq-chat'));

module.exports = router;
