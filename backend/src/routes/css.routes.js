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
const { rawMarkup, extractClassMap, applyClassMap } = require('../embed/templates');
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

// --- Rezervna mapa klasa (bez Gemme) ---
// Kad Gemma ne vrati upotrebljiv HTML, klase sajta biramo po imenu iz CSS-a organizacije
// (".gdg-card" -> kartice, ".gdg-btn" -> dugme...). Dodaju se SAMO klase na nas HTML
// (applyClassMap), struktura forme ostaje ista, pa forma radi kao i bez stila.
function siteClasses(css = '') {
  const noComments = String(css).replace(/\/\*[\s\S]*?\*\//g, '');
  const selectors = [...noComments.matchAll(/([^{}]+)\{/g)].map((m) => m[1]).join(',');
  const names = [...selectors.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)].map((m) => m[1]);
  return [...new Set(names)].filter((c) => !c.startsWith('infostone-') && /[a-z]/i.test(c) && c.length > 2);
}

function guessClassMap(css) {
  const classes = siteClasses(css);
  // najkraci naziv koji odgovara (".btn" pre ".btn-primary-large")
  const pick = (re, not) =>
    classes.filter((c) => re.test(c) && !(not && not.test(c))).sort((a, b) => a.length - b.length)[0];
  const card = pick(/card|panel|tile|surface|box/i, /accent|highlight|table|header|footer|title|body|img|image|text/i);
  const cardAccent = pick(/(card|panel).*(accent|highlight|featured)|(accent|highlight|featured).*(card|panel)/i);
  const map = {
    'infostone-header': [card, cardAccent],
    'infostone-question': [card],
    'infostone-title': [pick(/(^|[-_])title$/i, /sub/i) || pick(/title|heading|headline/i, /sub/i)],
    'infostone-question-title': [pick(/subtitle|label/i, /error|hidden/i)],
    'infostone-answer': [pick(/input|field|control|textbox/i, /group|wrap|label|error|invalid/i)],
    'infostone-option': [pick(/option|choice|check|radio/i, /group|list/i)],
    'infostone-file': [pick(/drop|upload|file/i)],
    'infostone-file-hint': [pick(/muted|hint|help|caption/i)],
    'infostone-submit': [pick(/(^|[-_])(btn|button)([-_]primary)?$/i) || pick(/btn|button/i, /secondary|outline|ghost|link|close|icon/i)],
  };
  for (const k of Object.keys(map)) {
    map[k] = map[k].filter(Boolean);
    if (!map[k].length) delete map[k];
  }
  return map;
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
  let appliedClasses = (result && result.applied_classes) || [];
  if (result && result.error) {
    // Pravi razlog (npr. "Failed to parse AI response: ..." ili "Gemma je promenila strukturu") ide u log
    console.error('css apply (Gemma):', String(result.error).slice(0, 500));
    notes.push('Gemma odgovor nije upotrebljiv.');
  }

  // Ako Gemma pokvari strukturu forme, zadrzi nas HTML (CSS sajta se i dalje primenjuje)
  const problems = html ? contractProblems(component, html) : ['prazan odgovor'];
  // AI servis vraca originalni HTML kad odbaci Gemma odgovor: i to je rezervni slucaj
  const usedFallback = problems.length > 0 || !!(result && result.error) || html === original.trim();
  if (problems.length) notes.push(`Gemma je promenila strukturu (${problems.join(', ')}).`);
  if (usedFallback) {
    // Bez Gemme: klase sajta po imenu iz CSS-a (kartice, polja, dugme), na nas proveren HTML
    const guessed = guessClassMap(source.rawCss);
    html = applyClassMap(original, guessed);
    appliedClasses = [...new Set(Object.values(guessed).flat())];
    notes.push(appliedClasses.length
      ? `Klase sajta dodate automatski: ${appliedClasses.join(', ')}.`
      : 'Koristi se originalni HTML sa CSS-om sajta.');
  }

  component.styledHtml = `<style>\n${cssForStyleTag(source.rawCss)}\n</style>\n${html}`;
  component.cssSourceId = source._id;
  await component.save();

  res.json({
    styledHtml: component.styledHtml,
    notes: notes.join(' '),
    appliedClasses,
    usedFallback,
  });
}));

module.exports = router;
