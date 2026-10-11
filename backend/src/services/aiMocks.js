// Lazni odgovori FastAPI-ja (oblik isti kao u docs/api-contract.md)
module.exports = {
  // Mock za ai/main.py POST /api/customize-css: vraca isti HTML uz dodatu "klasu sajta"
  '/api/customize-css': (body) => ({
    status: 'success',
    styled_html: body.form_html.replace('class="infostone-submit"', 'class="infostone-submit mock-site-button"'),
    applied_classes: ['mock-site-button'],
    error: null,
  }),
  // Mock za ai/main.py POST /api/screen-candidates-batch: skor = koliko reci iz prompta postoji u redu
  '/api/screen-candidates-batch': (body) => {
    const candidates = JSON.parse(body.candidates_json || '[]');
    const words = String(body.criteria || '').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2);
    const results = candidates.map((c) => {
      const text = JSON.stringify(c.data || {}).toLowerCase();
      const hits = words.filter((w) => text.includes(w));
      const score = words.length ? Math.round((hits.length / words.length) * 100) : 0;
      return {
        ...c,
        evaluation: {
          match_score: score,
          meets_criteria: score >= 50,
          summary: hits.length ? `Mock: u redu postoji ${hits.join(', ')}.` : 'Mock: nijedna rec iz prompta nije pronadjena.',
          key_highlights: hits,
        },
      };
    });
    results.sort((a, b) => b.evaluation.match_score - a.evaluation.match_score);
    return { status: 'success', total_screened: results.length, results };
  },
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
