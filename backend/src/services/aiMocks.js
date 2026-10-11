// Lazni odgovori FastAPI-ja (oblik isti kao u docs/api-contract.md)
module.exports = {
  // Mock za ai/main.py POST /api/customize-css: vraca isti HTML uz dodatu "klasu sajta"
  '/api/customize-css': (body) => ({
    status: 'success',
    styled_html: body.form_html.replace('class="infostone-submit"', 'class="infostone-submit mock-site-button"'),
    applied_classes: ['mock-site-button'],
    error: null,
  }),
  '/interpret-prompt': {
    mongo_query: { 'data.city': 'Beograd' },
    mongo_projection: null,
    mongo_sort: null,
    explanation: 'Mock: filtriram po gradu Beograd',
  },
  '/web-search': {
    summary: 'Mock: nasao sam 2 prostora.',
    results: [
      { title: 'Prostor A', url: 'https://example.com/a', snippet: 'Do 200 ljudi', relevance: 0.9 },
      { title: 'Prostor B', url: 'https://example.com/b', snippet: 'Centar grada', relevance: 0.7 },
    ],
  },
  '/analyze-cv': {
    skills: ['Python', 'SQL'],
    inferred_skills: ['Git', 'REST API', 'timski rad'],
    project_complexity_score: 7,
    tech_stack_breadth: 6,
    red_flags: [],
    status: 'ok',
    archetype: 'Passionate Builder',
  },
  '/cv-search': { results: [{ id: 'mock-submission-id', score: 0.88, reason: 'Iskustvo sa obradom signala u Pythonu' }] },
  '/cv-coach': {
    tips: ['Naglasi projekat sa bazama podataka.'],
    matched_companies: [{ name: 'Kompanija X', reason: 'Trazi backend profil' }],
  },
  '/marketing-content': {
    posts: { linkedin: 'Mock LinkedIn objava', instagram: 'Mock Instagram objava', newsletter: 'Mock newsletter' },
  },
  '/feedback-analysis': {
    satisfaction_score: 4.2,
    summary: 'Mock: ucesnici su zadovoljni.',
    alerts: [{ topic: 'Sala B', message: 'Ucesnici su zbunjeni', severity: 'medium' }],
    highlights: ['Tema X izaziva najvise uzbudjenja'],
  },
  '/agenda-recommend': { recommendations: [], matches: [] },
  '/faq-answer': { answer: 'Mock: registracija pocinje u 9h.' },
};
