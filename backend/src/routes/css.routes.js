// /api/css — povezivanje forme sa CSS-om organizacije preko Gemme (guide §7.1)
//
// Tok:
//  1. POST /upload  -> sacuvaj sirov CSS (css_sources) -> { cssSourceId }
//  2. POST /apply   -> klik "Primeni stil": sirov HTML komponente + CSS -> Gemma
//                      -> Gemma vrati spoj (styled_html) -> upisi u component.styledHtml
//  Gemma se zove SAMO na klik; iframe posle servira sacuvan rezultat (bez poziva Gemme).
const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { cssUpload } = require('../middleware/upload');
const { notImplemented } = require('../utils/http');

router.use(requireAuth);

// multipart polje "css"
// TODO: CssSource.create({ owner, originalFilename, rawCss: req.file.buffer.toString('utf8') }) -> { cssSourceId }
router.post('/upload', cssUpload.single('css'), notImplemented('POST /api/css/upload'));

// Body: { componentId, cssSourceId }
// TODO: component + cssSource iz baze (provera vlasnika)
//       html = require('../embed/templates').rawMarkup(component)
//       { styled_html, notes } = await aiClient.styleComponent(html, cssSource.rawCss)
//       component.styledHtml = styled_html; component.cssSourceId = cssSourceId; save
//       -> { styledHtml, notes } (za preview u dashboard-u)
router.post('/apply', notImplemented('POST /api/css/apply'));

module.exports = router;
