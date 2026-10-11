// /api/prompt  (guide §3.4 Prompt Box)
// JAVNO (poziva ga iframe), ali proverava plan vlasnika komponente
const router = require('express').Router();
const mongoose = require('mongoose');
const Component = require('../models/Component');
const User = require('../models/User');
const SearchHistory = require('../models/SearchHistory');
const { promptLimiter } = require('../middleware/rateLimit');
const { asyncHandler, HttpError } = require('../utils/http');
const { showPromptBox } = require('../embed/templates/layout');
const aiClient = require('../services/aiClient');

const MAX_PROMPT_LEN = 500; // guide §7.2/§7.3
const DEFAULT_TOP_K = 3;
const MAX_TOP_K = 10;

// search -> AI pretraga interneta (aiClient.discover) -> oblik PromptResponse iz frontend ai.model.ts:
// { summary, results: [{ title, url, snippet, relevance, location, details }] }
async function runSearch(component, prompt) {
  const topK = Math.min(Math.max(Number(component.schema?.maxResults) || DEFAULT_TOP_K, 1), MAX_TOP_K);

  let response;
  try {
    response = await aiClient.discover(prompt, topK);
  } catch (err) {
    throw new HttpError(502, `AI servis nije uspeo: ${err.message}`);
  }

  const data = response?.data || {};
  // discovery_service vraca { error, raw_response } kad Gemma odgovor nije validan JSON
  if (data.error) throw new HttpError(502, 'AI servis nije vratio ispravan odgovor, pokusaj ponovo.');

  const results = (Array.isArray(data.matches) ? data.matches : []).map((m) => ({
    title: String(m.title || m.url || ''),
    url: String(m.url || ''),
    snippet: String(m.summary || ''),
    relevance: Number.isFinite(Number(m.match_score)) ? Number(m.match_score) / 100 : undefined,
    location: m.location_or_domain ? String(m.location_or_domain) : undefined,
    details: Array.isArray(m.key_details) ? m.key_details.map(String) : [],
  }));

  const summary = results.length
    ? `Pronadjeno ${results.length} ${results.length === 1 ? 'rezultat' : 'rezultata'} za "${prompt}".`
    : data.message || 'Nisam nasao rezultate koji odgovaraju upitu. Probaj drugacije da formulises pretragu.';

  // Istorija pretraga (guide §5.5, opciono) - greska ovde ne sme da obori odgovor
  SearchHistory.create({
    componentId: component._id,
    prompt,
    results: results.map(({ title, url, snippet }) => ({ title, url, snippet })),
  }).catch((err) => console.error('search_history:', err.message));

  return { summary, results };
}

// Body: { prompt }
//  - form                         -> 403 (forma NIKAD nema prompt box)
//  - prompt box nije dozvoljen    -> 403 (pravilo iz embed/templates/layout.js showPromptBox)
//  - search                       -> aiClient.discover -> { summary, results } + SearchHistory
//  - tableview/graph              -> TODO: aiClient.interpretPrompt -> mongoWhitelist.assertSafe -> upit nad kolekcijom
router.post('/:componentId', promptLimiter, asyncHandler(async (req, res) => {
  const { componentId } = req.params;
  if (!mongoose.isValidObjectId(componentId)) throw new HttpError(404, 'Komponenta ne postoji');

  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  if (!prompt) throw new HttpError(400, 'Upit je prazan');
  if (prompt.length > MAX_PROMPT_LEN) throw new HttpError(400, `Upit je duzi od ${MAX_PROMPT_LEN} karaktera`);

  const component = await Component.findById(componentId).lean();
  if (!component) throw new HttpError(404, 'Komponenta ne postoji');
  if (component.type === 'form') throw new HttpError(403, 'Forma nema prompt box');
  // TODO: dozvoliti uz token iz /api/protected/:id/unlock kad se implementira (guide §3.3)
  if (component.sensitive) throw new HttpError(403, 'Komponenta je zasticena sifrom');

  const owner = await User.findOne({ username: component.owner }).lean();
  if (!showPromptBox(component, owner?.plan || 'free')) {
    throw new HttpError(403, 'Prompt box je dostupan samo u placenom planu');
  }

  if (component.type === 'search') return res.json(await runSearch(component, prompt));

  res.status(501).json({ error: 'Not implemented', route: `POST /api/prompt/:componentId (${component.type})` });
}));

module.exports = router;
