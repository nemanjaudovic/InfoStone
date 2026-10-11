// Jedino mesto koje zove FastAPI (Gemma servis, port 8000).
// MOCK_AI=true -> vraca lazne odgovore iz aiMocks.js, pa niko ne ceka AI servis.
// Kontrakt endpoint-a: docs/api-contract.md (FastAPI deo)
const fs = require('fs/promises');
const path = require('path');
const { config } = require('../config/env');
const mocks = require('./aiMocks');

// Mock moze biti objekat ili funkcija koja dobija body zahteva
const mock = (endpoint, body) => (typeof mocks[endpoint] === 'function' ? mocks[endpoint](body) : mocks[endpoint]);

// Gemma (Kaggle tunel) zna da bude spora -> 5 min pa odustajemo
const AI_TIMEOUT_MS = 300000;
// Chatbot: AI servis sam odustaje od Gemme posle ~60s (CHATBOT_GEMMA_TIMEOUT) i vraca odgovor iz teksta
const CHATBOT_TIMEOUT_MS = 120000;

async function post(endpoint, body) {
  if (config.mockAi) return mock(endpoint, body);
  const res = await fetch(`${config.aiServiceUrl}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`AI servis ${endpoint}: HTTP ${res.status}`);
  return res.json();
}

// FastAPI endpoint-i sa Form(...) parametrima traze application/x-www-form-urlencoded
async function postForm(endpoint, fields) {
  if (config.mockAi) return mock(endpoint, fields);
  const res = await fetch(`${config.aiServiceUrl}${endpoint}`, {
    method: 'POST',
    body: new URLSearchParams(fields),
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`AI servis ${endpoint}: HTTP ${res.status} ${await res.text().catch(() => '')}`.trim());
  return res.json();
}

// Slanje fajla (CV) kao multipart
async function postFile(endpoint, filePath, fields = {}) {
  if (config.mockAi) return mock(endpoint, fields);
  const form = new FormData();
  form.append('file', new Blob([await fs.readFile(filePath)]), path.basename(filePath));
  for (const [k, v] of Object.entries(fields)) form.append(k, typeof v === 'string' ? v : JSON.stringify(v));
  const res = await fetch(`${config.aiServiceUrl}${endpoint}`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`AI servis ${endpoint}: HTTP ${res.status}`);
  return res.json();
}

// Multipart sa poljima i opcionim fajlom iz memorije (multer memoryStorage).
// Greska nosi status i poruku FastAPI-ja (detail), da ruta moze da je prosledi korisniku.
async function postMultipart(endpoint, fields, file = null, timeoutMs = AI_TIMEOUT_MS) {
  if (config.mockAi) return mock(endpoint, { ...fields, file });
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, typeof v === 'string' ? v : JSON.stringify(v));
  if (file) form.append('file', new Blob([file.buffer]), file.originalname);
  const res = await fetch(`${config.aiServiceUrl}${endpoint}`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(typeof data.detail === 'string' ? data.detail : `AI servis ${endpoint}: HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

module.exports = {
  // guide §7
  // Gemma dodaje klase sa sajta organizacije na HTML komponente (ai/main.py: POST /api/customize-css)
  // -> { status, styled_html, applied_classes, error }
  styleComponent: (componentHtml, rawCss) =>
    postForm('/api/customize-css', { form_html: componentHtml, host_css: rawCss }),
  interpretPrompt: (componentType, prompt, availableFields, schemaHint = '') =>
    post('/interpret-prompt', { component_type: componentType, prompt, available_fields: availableFields, schema_hint: schemaHint }),
  webSearch: (prompt, maxResults = 5) => post('/web-search', { prompt, max_results: maxResults }),
  // AI pretraga interneta (ai/main.py: POST /api/discover -> ai/services/discovery_service.py)
  // Gemma preformulise upit, Tavily pretrazi, Gemma izabere i rangira top_k rezultata
  // -> { status, query, data: { total_found, matches: [{ title, location_or_domain, url, match_score, summary, key_details }] } }
  discover: (prompt, topK = 3) => postForm('/api/discover', { prompt, top_k: String(topK) }),

  // Chatbot (ai/main.py -> ai/services/chatbot_service.py, ai/utils/site_extractor.py)
  // Znanje iz sajta (url), nalepljenog teksta ili fajla (.html/.md/.txt)
  // -> { status, knowledge: { title, description, source, chunks: [{ id, heading, url, text }], stats, warnings } }
  chatbotKnowledge: ({ url = '', text = '' }, file = null) =>
    postMultipart('/api/chatbot/knowledge', { url, text }, file),
  // Odgovor na pitanje posetioca iz sacuvanog znanja; history = [{ question, answer }]
  // -> { status, answer, sources: [{ id, heading, url }], mode: 'gemma' | 'dummy' }
  chatbotAsk: (question, knowledge, history = []) =>
    postMultipart('/api/chatbot/ask', { question, knowledge_json: knowledge, history_json: history }, null, CHATBOT_TIMEOUT_MS),

  // Tabela + chatbox: Gemma ocenjuje svaki red prema promptu organizatora
  // (ai/main.py: POST /api/screen-candidates-batch, Form polja)
  // -> { status, total_screened, results: [ { ...red, evaluation: { match_score, meets_criteria, summary, key_highlights } } ] }
  screenCandidates: (candidates, criteria, filesDirectory) =>
    postForm('/api/screen-candidates-batch', {
      candidates_json: JSON.stringify(candidates),
      criteria,
      files_directory: filesDirectory,
    }),

  // Analiza CV-a
  analyzeCv: (filePath) => postFile('/analyze-cv', filePath),
  cvSearch: (query, candidates, topK = 5) => post('/cv-search', { query, candidates, top_k: topK }),
  cvCoach: (profile, companies) => post('/cv-coach', { profile, companies }),

  // Alati za organizatora
  marketingContent: (notes, channels) => post('/marketing-content', { notes, channels }),
  feedbackAnalysis: (entries, context = '') => post('/feedback-analysis', { entries, context }),
  agendaRecommend: (participants, sessions) => post('/agenda-recommend', { participants, sessions }),
  faqAnswer: (faq, schedule, question) => post('/faq-answer', { faq_context: faq, schedule_context: schedule, question }),
};
