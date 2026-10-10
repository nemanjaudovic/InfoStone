// /api/prompt  (guide §3.4 Prompt Box)
// JAVNO (poziva ga iframe), ali proverava plan vlasnika komponente
const router = require('express').Router();
const { promptLimiter } = require('../middleware/rateLimit');
const { notImplemented } = require('../utils/http');

// Body: { prompt }
// TODO:
//  - form                -> 403
//  - vlasnik nije "paid" -> 403
//  - tableview/graph     -> aiClient.interpretPrompt -> mongoWhitelist.assertSafe -> upit nad kolekcijom
//  - search              -> aiClient.webSearch -> (opciono) SearchHistory
router.post('/:componentId', promptLimiter, notImplemented('POST /api/prompt/:componentId'));

module.exports = router;
