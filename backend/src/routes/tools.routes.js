// /api/tools — AI alati za organizatora (dokument "AI ideje za dogadjaje", deo "Ideje za dogadjaje")
const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { promptLimiter } = require('../middleware/rateLimit');
const { notImplemented } = require('../utils/http');

router.use(requireAuth, promptLimiter);

// Marketinski sadrzaj. Body: { notes, channels: ["linkedin","instagram","newsletter","session_description"] }
router.post('/marketing', notImplemented('POST /api/tools/marketing'));

// Analiza povratnih informacija nad odgovorima iz feedback forme
// -> { satisfactionScore, summary, alerts: [{ topic, message, severity }], highlights }
router.post('/feedback/:componentId', notImplemented('POST /api/tools/feedback/:componentId'));

// Preporuka agende i networking (NICE). Body: { sessions, interestsField }
router.post('/agenda/:componentId', notImplemented('POST /api/tools/agenda/:componentId'));

// Cet-bot za ucesnike (FAQ i logistika). Body: { faq, schedule, question }
// Za sada test iz dashboard-a; embed kao 5. tip komponente je odluka za kasnije.
router.post('/faq-chat', notImplemented('POST /api/tools/faq-chat'));

module.exports = router;
