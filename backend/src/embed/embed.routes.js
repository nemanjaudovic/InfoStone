// GET /api/components/:id/embed — HTML stranica za <iframe> (guide §3, §4)
// Jedna dinamicka ruta: server pri svakom zahtevu cita komponentu iz baze i renderuje HTML.
// JAVNA ruta (bez JWT-a): sva pravila (plan, sensitive, prompt) se proveravaju OVDE.
const router = require('express').Router();
const mongoose = require('mongoose');
const Component = require('../models/Component');
const User = require('../models/User');
const { asyncHandler } = require('../utils/http');
const { renderPage } = require('./templates');
const { getCollection } = require('../services/dynamicCollections');

// Vrednost polja forme -> tekst za celiju
const cellText = (v) => (Array.isArray(v) ? v.join(', ') : v === null || v === undefined ? '' : String(v));

/**
 * Tableview = sacuvan rezultat pretrage tabele: { sourceComponentId, rowIds, columns }.
 * Redovi se citaju SVEZI iz kolekcije izvorne forme (redosled kao u rezultatu, obrisani nestaju).
 */
async function loadTableRows(component) {
  const schema = component.schema || {};
  component._columns = [];
  component._rows = [];
  if (!mongoose.isValidObjectId(schema.sourceComponentId)) return;
  const source = await Component.findOne({ _id: schema.sourceComponentId, owner: component.owner, type: 'form' }).lean();
  if (!source) return;

  const fields = ((source.schema && source.schema.fields) || []).filter((f) => (schema.columns || []).includes(f.name));
  const ids = (schema.rowIds || []).filter((id) => mongoose.isValidObjectId(id));
  const docs = await getCollection(source.collectionName)
    .find({ _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) } })
    .toArray();
  const byId = new Map(docs.map((d) => [String(d._id), d]));

  component._columns = fields.map((f) => f.label || f.name);
  component._rows = ids
    .filter((id) => byId.has(id))
    .map((id) => {
      const d = byId.get(id);
      return fields.map((f) => (f.type === 'file'
        ? (d.files || []).filter((x) => x.field === f.name).map((x) => x.filename).join(', ')
        : cellText(d.data && d.data[f.name])));
    });
}

// Demo komponenta: /api/components/demo-form/embed radi i pre nego sto CRUD proradi
const DEMO = {
  _id: 'demo-form',
  type: 'form',
  title: 'Demo prijava',
  schema: {
    fields: [
      { name: 'fullName', label: 'Ime i prezime', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'text', inputType: 'email', required: true },
      { name: 'motivation', label: 'Motivacija', type: 'textarea' },
      { name: 'track', label: 'Track', type: 'radio', options: ['AI', 'Web', 'Mobile'] },
      { name: 'cv', label: 'CV', type: 'file' },
    ],
  },
  styledHtml: '', // prazno = prikazuje se sirov HTML (stil nije primenjen)
  sensitive: false,
  promptEnabled: false,
};

router.get('/:id/embed', asyncHandler(async (req, res) => {
  let component;
  let plan = 'free';

  if (req.params.id === 'demo-form') {
    component = DEMO;
  } else {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).send('Not found');
    component = await Component.findById(req.params.id).lean();
    if (!component) return res.status(404).send('Not found');
    const owner = await User.findOne({ username: component.owner }).lean();
    plan = owner?.plan || 'free';
    if (component.type === 'tableview' && !component.sensitive) await loadTableRows(component);
  }

  // Iframe mora moci da se ugradi na tudji sajt (NE koristiti helmet frameguard ovde)
  res.set('Content-Security-Policy', 'frame-ancestors *');
  res.set('Cache-Control', 'no-store');

  // Gemma se NE zove ovde: servira se sacuvan component.styledHtml (vidi /api/css/apply)
  // Sensitive -> shell za sifru; sadrzaj tek posle /api/protected/:id/unlock
  try {
    res.send(renderPage(component, { plan, locked: component.sensitive }));
  } catch {
    res.status(400).send('Unknown component type');
  }
}));

module.exports = router;
