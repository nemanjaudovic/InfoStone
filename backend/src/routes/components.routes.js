// /api/components  (guide §6 Komponente)
// NAPOMENA: /:id/embed je u embed/embed.routes.js (javna ruta)
const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { notImplemented } = require('../utils/http');

router.use(requireAuth);

// TODO: Component.find({ owner: req.user.username })
router.get('/', notImplemented('GET /api/components'));

// Body: { type, title, schema, sensitive, promptEnabled }
// TODO: nextIndex(owner, type) -> collectionName -> kreiraj kolekciju;
//       ako je sensitive: generisi sifru, sacuvaj hash, vrati sifru JEDNOM u odgovoru
router.post('/', notImplemented('POST /api/components'));

router.get('/:id', notImplemented('GET /api/components/:id'));

// Izmena komponente (ekran /components/:id/edit).
// TODO: ako se promene polja (schema), resetuj styledHtml = '' jer stari stil vise ne odgovara HTML-u
router.put('/:id', notImplemented('PUT /api/components/:id'));

// TODO: obrisi i dinamicku kolekciju
router.delete('/:id', notImplemented('DELETE /api/components/:id'));

module.exports = router;
