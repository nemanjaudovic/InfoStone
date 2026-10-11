// /api/css — povezivanje komponente sa CSS-om organizacije preko Gemme (ai/main.py: /api/customize-css)
//
// Tok:
//  1. POST /upload  -> sacuvaj sirov CSS (css_sources) -> { cssSourceId }
//  2. POST /apply   -> klik "Generate": sirov HTML komponente + CSS -> Gemma
//                      -> Gemma doda klase sajta na HTML (styled_html)
//                      -> cuvamo <style>CSS sajta</style> + styled_html u component.styledHtml
//  CSS sajta MORA uci u iframe: iframe je izolovan, klase sa sajta bez tog CSS-a ne rade nista.
//  Gemma se zove SAMO na klik; iframe posle servira sacuvan rezultat.
//  MOCK_AI=true -> aiClient vraca lazni odgovor (radi bez AI servisa).
const router = require('express').Router();
const mongoose = require('mongoose');
const Component = require('../models/Component');
const CssSource = require('../models/CssSource');
const { requireAuth } = require('../middleware/auth');
const { cssUpload } = require('../middleware/upload');
const { asyncHandler, HttpError } = require('../utils/http');
const { rawMarkup, extractClassMap } = require('../embed/templates');
const aiClient = require('../services/aiClient');

router.use(requireAuth);

// CSS ide u <style>; "</style" bi zatvorio tag i otvorio prostor za HTML/JS
const cssForStyleTag = (css = '') => String(css).replace(/<\/style/gi, '<\\/style');

/**
 * Da li Gemma izlaz i dalje radi sa nasom skriptom (embed/public/form.js, chatbot.js):
 * mora postojati <form> i sva polja sa istim name atributima. Vraca listu problema.
 */
function contractProblems(component, html) {
  const problems = [];
  if (component.type === 'form') {
    if (!/<form[\s>]/i.test(html)) problems.push('nema <form> taga');
    for (const f of (component.schema && component.schema.fields) || []) {
      const re = new RegExp(`name\\s*=\\s*["']${f.name}["']`);
      if (!re.test(html)) problems.push(`nedostaje polje "${f.name}"`);
    }
  }
  // Chatbot (embed/public/chatbot.js): bez <form> i polja za pitanje ostaje samo pozdrav
  if (component.type === 'chatbot') {
    if (!/<form[\s>]/i.test(html)) problems.push('nema <form> taga');
    if (!/<(input|textarea)[\s>]/i.test(html)) problems.push('nema polja za pitanje');
  }
  return problems;
}

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

// Body: { componentId, cssSourceId } -> { styledHtml, notes, appliedClasses, usedFallback }
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

  // Tabela: Gemmi ide uzorak (2 reda), a cuva se samo CSS sajta + mapa klasa.
  // Pravi redovi se citaju pri svakom prikazu iframe-a (embed.routes.js).
  if (component.type === 'tableview') {
    let tableResult;
    try {
      tableResult = await aiClient.styleComponent(rawMarkup(component), source.rawCss);
    } catch (err) {
      throw new HttpError(502, `AI servis nije uspeo: ${err.message}`);
    }
    const classMap = extractClassMap((tableResult && tableResult.styled_html) || '');
    component.styledHtml = `<style>\n${cssForStyleTag(source.rawCss)}\n</style>\n`;
    component.schema = { ...(component.schema || {}), classMap };
    component.markModified('schema');
    component.cssSourceId = source._id;
    await component.save();
    const usedFallback = Object.keys(classMap).length === 0;
    return res.json({
      styledHtml: component.styledHtml,
      notes: usedFallback ? 'Gemma nije dodala klase sajta; primenjen je samo CSS sajta.' : '',
      appliedClasses: (tableResult && tableResult.applied_classes) || [],
      usedFallback,
    });
  }

  const original = rawMarkup(component);
  let result;
  try {
    result = await aiClient.styleComponent(original, source.rawCss);
  } catch (err) {
    throw new HttpError(502, `AI servis nije uspeo: ${err.message}`);
  }

  let html = result && typeof result.styled_html === 'string' ? result.styled_html.trim() : '';
  const notes = [];
  if (result && result.error) notes.push('Gemma odgovor nije mogao da se procita, koristi se originalni HTML.');

  // Ako Gemma pokvari strukturu forme, zadrzi nas HTML (CSS sajta se i dalje primenjuje)
  const problems = html ? contractProblems(component, html) : ['prazan odgovor'];
  const usedFallback = problems.length > 0;
  if (usedFallback) {
    notes.push(`Gemma je promenila strukturu (${problems.join(', ')}), koristi se originalni HTML sa CSS-om sajta.`);
    html = original;
  }

  component.styledHtml = `<style>\n${cssForStyleTag(source.rawCss)}\n</style>\n${html}`;
  component.cssSourceId = source._id;
  await component.save();

  res.json({
    styledHtml: component.styledHtml,
    notes: notes.join(' '),
    appliedClasses: (result && result.applied_classes) || [],
    usedFallback,
  });
}));

module.exports = router;
