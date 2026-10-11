// /api/tools — AI alati za organizatora (dokument "AI ideje za dogadjaje", deo "Ideje za dogadjaje")
// + dev alati: pregled tabela (kolekcija) i upitna konzola (phpMyAdmin stil)
const path = require('path');
const router = require('express').Router();
const mongoose = require('mongoose');
const multer = require('multer');
const Component = require('../models/Component');
const { requireAuth } = require('../middleware/auth');
const { promptLimiter } = require('../middleware/rateLimit');
const { asyncHandler, HttpError, notImplemented } = require('../utils/http');
const { assertSafeQuery, assertSafePipeline } = require('../services/mongoWhitelist');
const { getCollection } = require('../services/dynamicCollections');
const aiClient = require('../services/aiClient');

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
// Chatbot: znanje koje bot koristi (5. tip komponente, odgovori idu kroz /api/prompt/:id)
// Znanje se cuva u kolekciji komponente ({owner}_chatbot_{n}) kao dokument _id: "knowledge";
// u istoj kolekciji su i pitanja posetilaca (type: "chat"), vidi routes/prompt.routes.js.
// ============================================================================

const KNOWLEDGE_DOC_ID = 'knowledge';
const KNOWLEDGE_EXT = ['.html', '.htm', '.md', '.txt'];
const knowledgeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    KNOWLEDGE_EXT.includes(path.extname(file.originalname).toLowerCase())
      ? cb(null, true)
      : cb(new Error(`Dozvoljeni su samo ${KNOWLEDGE_EXT.join(', ')} fajlovi`)),
});

// Multer greske (npr. fajl veci od 2MB, pogresan tip) kao 400 umesto 500
function uploadKnowledgeFile(req, res, next) {
  knowledgeUpload.single('file')(req, res, (err) => {
    if (!err) return next();
    next(new HttpError(400, err.code === 'LIMIT_FILE_SIZE' ? 'Fajl je veci od 2MB' : err.message));
  });
}

async function loadOwnedChatbot(req) {
  if (!mongoose.isValidObjectId(req.params.componentId)) throw new HttpError(404, 'Komponenta ne postoji');
  const component = await Component.findOne({ _id: req.params.componentId, owner: req.user.username }).lean();
  if (!component || component.type !== 'chatbot') throw new HttpError(404, 'Chatbot komponenta ne postoji');
  return component;
}

// Sacuvano znanje (pregled u dashboard-u) -> { title, source, stats, warnings, chunks, builtAt } ili 404
router.get('/chatbot/:componentId/knowledge', requireAuth, asyncHandler(async (req, res) => {
  const component = await loadOwnedChatbot(req);
  const doc = await getCollection(component.collectionName).findOne({ _id: KNOWLEDGE_DOC_ID });
  if (!doc) throw new HttpError(404, 'Chatbot jos nema znanje');
  const { _id, ...knowledge } = doc;
  res.json(knowledge);
}));

// ============================================================================
// AI alati (rate limitovani)
// ============================================================================

router.use(requireAuth, promptLimiter);

// Pravljenje znanja za chatbot. Tacno jedan izvor:
//   JSON { url }  -> AI servis cita sajt (do 10 stranica istog domena)
//   JSON { text } -> nalepljen tekst / Markdown / HTML
//   multipart "file" (.html, .htm, .md, .txt, do 2MB)
// -> { title, source, stats, warnings, chunks, builtAt }  (staro znanje se zamenjuje)
router.post('/chatbot/:componentId/knowledge', uploadKnowledgeFile, asyncHandler(async (req, res) => {
  const component = await loadOwnedChatbot(req);
  const url = typeof req.body.url === 'string' ? req.body.url.trim() : '';
  const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
  if ([req.file, url, text].filter(Boolean).length !== 1) {
    throw new HttpError(400, 'Posalji tacno jedan izvor: url, text ili fajl (.html, .md, .txt)');
  }
  if (url && !/^https?:\/\//i.test(url)) throw new HttpError(400, 'URL mora pocinjati sa http:// ili https://');

  let result;
  try {
    result = await aiClient.chatbotKnowledge({ url, text }, req.file || null);
  } catch (err) {
    // 400 iz AI servisa = problem sa izvorom (npr. stranica bez teksta), poruka ide korisniku
    throw new HttpError(err.status === 400 ? 400 : 502, err.status === 400 ? err.message : `AI servis nije uspeo: ${err.message}`);
  }
  const knowledge = result && result.knowledge;
  if (!knowledge || !Array.isArray(knowledge.chunks) || !knowledge.chunks.length) {
    throw new HttpError(502, 'AI servis nije vratio znanje');
  }

  const doc = { ...knowledge, builtAt: new Date() };
  await getCollection(component.collectionName).replaceOne({ _id: KNOWLEDGE_DOC_ID }, doc, { upsert: true });
  res.status(201).json(doc);
}));

// Marketinski sadrzaj. Body: { notes, channels: ["linkedin","instagram","newsletter","session_description"] }
router.post('/marketing', notImplemented('POST /api/tools/marketing'));

// Analiza povratnih informacija nad odgovorima iz feedback forme
// -> { satisfactionScore, summary, alerts: [{ topic, message, severity }], highlights }
router.post('/feedback/:componentId', notImplemented('POST /api/tools/feedback/:componentId'));

// Preporuka agende i networking (NICE). Body: { sessions, interestsField }
router.post('/agenda/:componentId', notImplemented('POST /api/tools/agenda/:componentId'));

// Cet-bot za ucesnike: uradjen kao 5. tip komponente ("chatbot") - znanje gore
// (/chatbot/:componentId/knowledge), pitanja kroz javni /api/prompt/:componentId.

module.exports = router;
