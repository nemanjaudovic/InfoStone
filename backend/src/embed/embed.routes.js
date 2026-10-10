// GET /api/components/:id/embed — HTML stranica za <iframe> (guide §3, §4)
// Jedna dinamicka ruta: server pri svakom zahtevu cita komponentu iz baze i renderuje HTML.
// JAVNA ruta (bez JWT-a): sva pravila (plan, sensitive, prompt) se proveravaju OVDE.
const router = require('express').Router();
const mongoose = require('mongoose');
const Component = require('../models/Component');
const User = require('../models/User');
const { asyncHandler } = require('../utils/http');
const { renderPage } = require('./templates');

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
