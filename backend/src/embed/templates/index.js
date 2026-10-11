// Registar template-a po tipu komponente + pomocne funkcije za renderovanje
const { layout, sanitizeStyledHtml } = require('./layout');

const templates = {
  form: require('./form'),
  tableview: require('./tableview'),
  search: require('./search'),
  graph: require('./graph'),
  locked: require('./locked'),
};

// --- Mapa klasa (Gemma -> nasa tabela) ---
// Za tabelu Gemmi saljemo UZORAK (2 reda); iz njenog odgovora citamo koje klase sajta idu na koji
// nas element (npr. infostone-table -> site-table) i to primenjujemo na PRAVE redove pri prikazu.
const TAG_RE = /<([a-zA-Z][\w-]*)\b([^>]*)>/g;
const attr = (attrs, name) => {
  const m = attrs.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'));
  return m ? (m[2] !== undefined ? m[2] : m[3]) : null;
};
const ownClass = (attrs) => (attr(attrs, 'class') || '').split(/\s+/).find((c) => c.startsWith('infostone-'));

function extractClassMap(styledHtml = '') {
  const map = {};
  for (const [, , attrs] of String(styledHtml).matchAll(TAG_RE)) {
    const key = ownClass(attrs);
    if (!key) continue;
    const extra = (attr(attrs, 'class') || '').split(/\s+/).filter((c) => /^[A-Za-z_-][\w-]*$/.test(c) && !c.startsWith('infostone-'));
    if (extra.length) map[key] = [...new Set([...(map[key] || []), ...extra])];
  }
  return map;
}

function applyClassMap(html, map = {}) {
  if (!map || !Object.keys(map).length) return html;
  return html.replace(TAG_RE, (whole, tag, attrs) => {
    const key = ownClass(attrs);
    const extra = key && map[key];
    if (!extra) return whole;
    const merged = [...new Set([...(attr(attrs, 'class') || '').split(/\s+/).filter(Boolean), ...extra])].join(' ');
    return `<${tag}${attrs.replace(/\bclass\s*=\s*("[^"]*"|'[^']*')/i, `class="${merged}"`)}>`;
  });
}

// Sirov HTML komponente — to je ono sto se salje Gemmi na "Primeni stil" (/api/css/apply)
function rawMarkup(component) {
  const t = templates[component.type];
  if (!t) throw new Error(`Nepoznat tip komponente: ${component.type}`);
  return t.markup(component);
}

// Kompletna iframe stranica: sacuvan Gemma spoj (ako postoji) ili sirov HTML, + serverska pravila
function renderPage(component, { plan, locked = false }) {
  const t = locked ? templates.locked : templates[component.type];
  if (!t) throw new Error(`Nepoznat tip komponente: ${component.type}`);
  let markup;
  if (!locked && component.type === 'tableview') {
    // Tabela: styledHtml je samo <style> sa CSS-om sajta; redovi su uvek pravi (ucitani pri prikazu)
    const style = component.styledHtml ? sanitizeStyledHtml(component.styledHtml) : '';
    markup = style + applyClassMap(t.markup(component), component.schema && component.schema.classMap);
  } else {
    markup = !locked && component.styledHtml ? sanitizeStyledHtml(component.styledHtml) : t.markup(component);
  }
  return layout(component, { plan, markup, script: t.script, extraHead: t.extraHead });
}

module.exports = { templates, rawMarkup, renderPage, extractClassMap, applyClassMap };
