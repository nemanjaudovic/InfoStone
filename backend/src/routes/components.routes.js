// /api/components  (guide §6 Komponente)
// NAPOMENA: /:id/embed je u embed/embed.routes.js (javna ruta)
const crypto = require('crypto');
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Component = require('../models/Component');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler, HttpError } = require('../utils/http');
const { collectionName, nextIndex, getCollection } = require('../services/dynamicCollections');

const TYPES = ['form', 'tableview', 'search', 'graph', 'chatbot'];
const FIELD_TYPES = ['text', 'textarea', 'checkbox', 'radio', 'file'];
const FIELD_NAME_RE = /^[a-zA-Z][a-zA-Z0-9_]{0,40}$/;

router.use(requireAuth);

// --- pomocne funkcije ---

// Komponenta bez passwordHash
function toPublic(c) {
  const obj = typeof c.toObject === 'function' ? c.toObject() : { ...c };
  delete obj.passwordHash;
  obj.hasPassword = !!c.passwordHash;
  return obj;
}

// Ucitaj komponentu ulogovanog korisnika ili 404
async function loadOwned(req) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'Komponenta ne postoji');
  const component = await Component.findOne({ _id: req.params.id, owner: req.user.username });
  if (!component) throw new HttpError(404, 'Komponenta ne postoji');
  return component;
}

// Provera polja forme (guide §4.1): text, textarea, checkbox, radio, file
function validateFormSchema(schema) {
  const fields = schema && schema.fields;
  if (!Array.isArray(fields) || fields.length === 0) throw new HttpError(400, 'Forma mora imati bar jedno polje');
  const names = new Set();
  for (const f of fields) {
    if (!f || !FIELD_NAME_RE.test(f.name || '')) {
      throw new HttpError(400, `Neispravno ime polja "${f && f.name}" (slova, brojevi, _; pocinje slovom)`);
    }
    if (names.has(f.name)) throw new HttpError(400, `Polje "${f.name}" se ponavlja`);
    names.add(f.name);
    if (!FIELD_TYPES.includes(f.type)) throw new HttpError(400, `Nepoznat tip polja "${f.type}"`);
    if ((f.type === 'checkbox' || f.type === 'radio') && (!Array.isArray(f.options) || f.options.length === 0)) {
      throw new HttpError(400, `Polje "${f.name}" mora imati opcije`);
    }
  }
}

// Tableview iz rezultata pretrage tabele (stranica Table):
// schema = { sourceComponentId, rowIds, columns, prompt } -> proverava vlasnistvo i dopunjuje columnLabels
const MAX_TABLE_ROWS = 500;
async function normalizeTableSchema(schema, owner) {
  if (!schema || !mongoose.isValidObjectId(schema.sourceComponentId)) {
    throw new HttpError(400, 'Tabela mora imati izvornu formu (sourceComponentId)');
  }
  const source = await Component.findOne({ _id: schema.sourceComponentId, owner, type: 'form' }).lean();
  if (!source) throw new HttpError(404, 'Izvorna forma ne postoji');

  const fields = (source.schema && source.schema.fields) || [];
  const columns = (Array.isArray(schema.columns) ? schema.columns : []).filter((c) => fields.some((f) => f.name === c));
  if (!columns.length) throw new HttpError(400, 'Izaberi bar jednu kolonu');
  const rowIds = (Array.isArray(schema.rowIds) ? schema.rowIds : []).map(String).filter((id) => mongoose.isValidObjectId(id));
  if (rowIds.length > MAX_TABLE_ROWS) throw new HttpError(400, `Najvise ${MAX_TABLE_ROWS} redova`);

  return {
    sourceComponentId: String(source._id),
    columns,
    columnLabels: columns.map((c) => { const f = fields.find((x) => x.name === c); return f.label || f.name; }),
    rowIds,
    prompt: String(schema.prompt || '').slice(0, 500),
  };
}

// Sifra za sensitive komponentu: vraca se developeru SAMO jednom
const generatePassword = () => crypto.randomBytes(4).toString('hex');

// --- rute ---

router.get('/', asyncHandler(async (req, res) => {
  const list = await Component.find({ owner: req.user.username }).sort({ createdAt: -1 });
  res.json(list.map(toPublic));
}));

// Body: { type, title, schema, sensitive, promptEnabled } -> 201 { component, password? }
router.post('/', asyncHandler(async (req, res) => {
  const { type, title = '', sensitive = false } = req.body;
  let { schema = {} } = req.body;
  if (!TYPES.includes(type)) throw new HttpError(400, `Tip mora biti jedan od: ${TYPES.join(', ')}`);
  if (type === 'form') validateFormSchema(schema);

  const owner = req.user.username;
  if (type === 'tableview') schema = await normalizeTableSchema(schema, owner);
  // Prompt box pravila (guide §3.4): form nikad, search i chatbot uvek (polje za pitanje je cela komponenta)
  const promptEnabled = type === 'search' || type === 'chatbot' ? true : type === 'form' ? false : !!req.body.promptEnabled;

  let password = null;
  let passwordHash = null;
  if (sensitive) {
    password = generatePassword();
    passwordHash = await bcrypt.hash(password, 10);
  }

  // Dva brza zahteva mogu dobiti isti index -> jedan ponovni pokusaj
  let component;
  for (let attempt = 0; attempt < 2 && !component; attempt++) {
    const index = await nextIndex(owner, type);
    try {
      component = await Component.create({
        owner, type, index, collectionName: collectionName(owner, type, index),
        title: String(title).slice(0, 200), schema, sensitive: !!sensitive, passwordHash, promptEnabled,
      });
    } catch (err) {
      if (err.code !== 11000 || attempt === 1) throw err;
    }
  }

  // Svaka komponenta ima svoju kolekciju (guide §3.1)
  await mongoose.connection.db.createCollection(component.collectionName).catch((err) => {
    if (err.codeName !== 'NamespaceExists') throw err;
  });

  res.status(201).json({ component: toPublic(component), ...(password ? { password } : {}) });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  res.json(toPublic(await loadOwned(req)));
}));

// Izmena (ekran /components/:id/edit). Body: bilo sta od { title, schema, sensitive, promptEnabled }
// Promena polja resetuje styledHtml (stari Gemma spoj vise ne odgovara HTML-u).
// Izuzetak: chatbot (schema je samo pozdrav, ne menja HTML), pa izmena ne brise CSS stil.
// Ako se sensitive ukljuci prvi put, u odgovoru stize `password` (jednom).
router.put('/:id', asyncHandler(async (req, res) => {
  const component = await loadOwned(req);
  let password = null;

  if (req.body.title !== undefined) component.title = String(req.body.title).slice(0, 200);
  if (req.body.schema !== undefined) {
    if (component.type === 'form') validateFormSchema(req.body.schema);
    component.schema = req.body.schema;
    component.markModified('schema');
    if (component.type !== 'chatbot') component.styledHtml = '';
  }
  if (req.body.promptEnabled !== undefined && !['form', 'search', 'chatbot'].includes(component.type)) {
    component.promptEnabled = !!req.body.promptEnabled;
  }
  if (req.body.sensitive !== undefined) {
    component.sensitive = !!req.body.sensitive;
    if (component.sensitive && !component.passwordHash) {
      password = generatePassword();
      component.passwordHash = await bcrypt.hash(password, 10);
    }
  }

  await component.save();
  res.json({ ...toPublic(component), ...(password ? { password } : {}) });
}));

// Brise komponentu, njenu kolekciju (prijave). Uploadovani fajlovi ostaju na disku.
router.delete('/:id', asyncHandler(async (req, res) => {
  const component = await loadOwned(req);
  await getCollection(component.collectionName).drop().catch((err) => {
    if (err.codeName !== 'NamespaceNotFound') throw err;
  });
  await component.deleteOne();
  res.status(204).end();
}));

module.exports = router;
