// /api/cv — Analiza CV-a (dokument "AI ideje za dogadjaje", deo "Analiza CV-a")
// CV-evi dolaze iz form komponente (file polje). Rezultat analize se upisuje
// u isti submission dokument kao polje `cvAnalysis` (nema nove kolekcije).
const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { promptLimiter } = require('../middleware/rateLimit');
const { notImplemented } = require('../utils/http');

// 1. Obrada podataka: za svaki submission sa CV fajlom -> aiClient.analyzeCv
//    -> cvAnalysis { skills, inferredSkills, projectComplexityScore, techStackBreadth,
//                    redFlags, status: ok|unverified|needs_review, archetype }
router.post('/:componentId/analyze', requireAuth, notImplemented('POST /api/cv/:componentId/analyze'));

// Lista analiziranih profila. ?blind=true -> Blind Recruiting Mode
// (ukloni ime, pol, sliku, fakultet; ostaju samo vestine i projekti)
router.get('/:componentId/profiles', requireAuth, notImplemented('GET /api/cv/:componentId/profiles'));

// 2. Semanticka pretraga po problemu. Body: { query, topK }
//    -> [{ submissionId, score, reason }] (kratko obrazlozenje izbora)
router.post('/:componentId/search', requireAuth, promptLimiter, notImplemented('POST /api/cv/:componentId/search'));

// 3. AI CV Coach & Matcher za ucesnika (JAVNO, poziva ga forma posle submit-a)
//    Body: { coachToken } dobijen u odgovoru /api/submit -> { tips, matchedCompanies }
//    Kompanije na dogadjaju: component.schema.companies
router.post('/coach/:submissionId', promptLimiter, notImplemented('POST /api/cv/coach/:submissionId'));

module.exports = router;
