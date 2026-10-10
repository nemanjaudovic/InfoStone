// /api/css — povezivanje komponente sa CSS-om organizacije preko Gemme (guide §7.1)
//
// Tok:
//  1. POST /upload  -> sacuvaj sirov CSS (css_sources) -> { cssSourceId }
//  2. POST /apply   -> klik "Primeni stil": sirov HTML komponente + CSS -> Gemma
//                      -> Gemma vrati spoj (styled_html) -> upisi u component.styledHtml
//  Gemma se zove SAMO na klik; iframe posle servira sacuvan rezultat (bez poziva Gemme).
//  MOCK_AI=true -> aiClient vraca lazni spoj (radi bez AI servisa).
const router = require('express').Router();
const mongoose = require('mongoose');
const Component = require('../models/Component');
const CssSource = require('../models/CssSource');
const { requireAuth } = require('../middleware/auth');
const { cssUpload } = require('../middleware/upload');
const { asyncHandler, HttpError } = require('../utils/http');
const { rawMarkup } = require('../embed/templates');
const aiClient = require('../services/aiClient');

router.use(requireAuth);

// multipart polje "css" -> { cssSourceId }
router.post('/upload', cssUpload.single('css'), asyncHandler(async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Nedostaje fajl (polje "css")');
  if (!/\.css$/i.test(req.file.originalname)) throw new HttpError(400, 'Fajl mora biti .css');

  const source = await CssSource.create({
    owner: req.user.username,
    originalFilename: req.file.originalname,
    rawCss: req.file.buffer.toString('utf8'),
  });
  res.status(201).json({ cssSourceId: String(source._id) });
}));

// Body: { componentId, cssSourceId } -> { styledHtml, notes }
router.post('/apply', asyncHandler(async (req, res) => {
  const { componentId, cssSourceId } = req.body;
  if (!mongoose.isValidObjectId(componentId) || !mongoose.isValidObjectId(cssSourceId)) {
    throw new HttpError(400, 'Neispravan componentId ili cssSourceId');
  }

  const owner = req.user.username;
  const [component, source] = await Promise.all([
    Component.findOne({ _id: componentId, owner }),
    CssSource.findOne({ _id: cssSourceId, owner }).lean(),
  ]);
  if (!component) throw new HttpError(404, 'Komponenta ne postoji');
  if (!source) throw new HttpError(404, 'CSS ne postoji');

  let result;
  try {
    result = await aiClient.styleComponent(rawMarkup(component), source.rawCss);
  } catch (err) {
    throw new HttpError(502, `AI servis nije uspeo: ${err.message}`);
  }
  if (!result || typeof result.styled_html !== 'string' || !result.styled_html.trim()) {
    throw new HttpError(502, 'AI servis je vratio prazan rezultat');
  }

  component.styledHtml = result.styled_html;
  component.cssSourceId = source._id;
  await component.save();
  res.json({ styledHtml: component.styledHtml, notes: result.notes || '' });
}));

module.exports = router;
