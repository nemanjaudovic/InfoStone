// Registar template-a po tipu komponente + pomocne funkcije za renderovanje
const { layout, sanitizeStyledHtml } = require('./layout');

const templates = {
  form: require('./form'),
  tableview: require('./tableview'),
  search: require('./search'),
  graph: require('./graph'),
  locked: require('./locked'),
};

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
  const markup = !locked && component.styledHtml ? sanitizeStyledHtml(component.styledHtml) : t.markup(component);
  return layout(component, { plan, markup, script: t.script, extraHead: t.extraHead });
}

module.exports = { templates, rawMarkup, renderPage };
