// Jedino mesto koje zove FastAPI (Gemma servis, port 8000).
// MOCK_AI=true -> vraca lazne odgovore iz aiMocks.js, pa niko ne ceka AI servis.
// Kontrakt endpoint-a: docs/api-contract.md (FastAPI deo)
const fs = require('fs/promises');
const path = require('path');
const { config } = require('../config/env');
const mocks = require('./aiMocks');

// Mock moze biti objekat ili funkcija koja dobija body zahteva
const mock = (endpoint, body) => (typeof mocks[endpoint] === 'function' ? mocks[endpoint](body) : mocks[endpoint]);

async function post(endpoint, body) {
  if (config.mockAi) return mock(endpoint, body);
  const res = await fetch(`${config.aiServiceUrl}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`AI servis ${endpoint}: HTTP ${res.status}`);
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

module.exports = {
  // guide §7
  // Spoj HTML-a komponente i CSS-a organizacije -> { styled_html, notes }
  styleComponent: (componentHtml, rawCss) =>
    post('/generate-css', { component_html: componentHtml, raw_css: rawCss }),
  interpretPrompt: (componentType, prompt, availableFields, schemaHint = '') =>
    post('/interpret-prompt', { component_type: componentType, prompt, available_fields: availableFields, schema_hint: schemaHint }),
  webSearch: (prompt, maxResults = 5) => post('/web-search', { prompt, max_results: maxResults }),

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
