// Form (guide §4.1): text, textarea, checkbox, radio, file. NEMA prompt box.
// markup() je sirov HTML forme: salje se Gemmi na "Generate" i prikazuje dok stil nije primenjen.
// Zaglavlje + svako pitanje u svojoj kartici. Bez kontrola builder-a (edit/delete/add,
// Mandatory, CSS upload, Generate). Neutralan izgled (NEMA "Your answer" / "* obavezno polje"
// Google Forms tekstova) — izgled daje CSS sajta organizacije.
// Klase infostone-* i name atributi su ugovor sa embed/public/form.js — Gemma ih ne sme menjati.
const { escapeHtml } = require('./layout');

const star = (f) => (f.required ? ' <span class="infostone-required" aria-hidden="true">*</span>' : '');

function question(f) {
  const name = escapeHtml(f.name);
  const id = `f-${name}`;
  const title = escapeHtml(f.label || f.name);
  const req = f.required ? ' required' : '';
  const len = `${f.minLength ? ` minlength="${f.minLength}"` : ''}${f.maxLength ? ` maxlength="${f.maxLength}"` : ''}`;
  const options = f.options || [];

  let body;
  switch (f.type) {
    case 'textarea':
      body = `<textarea class="infostone-answer infostone-input" id="${id}" name="${name}" rows="3"${req}${len}></textarea>`;
      break;
    case 'checkbox':
    case 'radio':
      body = `<div class="infostone-options">${options
        .map((o) => `<label class="infostone-option"><input type="${f.type}" name="${name}" value="${escapeHtml(o)}"> <span>${escapeHtml(o)}</span></label>`)
        .join('')}</div>`;
      break;
    case 'file':
      body = `<label class="infostone-file"><input type="file" id="${id}" name="${name}" accept=".pdf,.docx,.png,.jpg,.jpeg"${req}><span class="infostone-file-hint">PDF, DOCX, PNG ili JPG, do 5MB</span></label>`;
      break;
    default: // text
      body = `<input class="infostone-answer infostone-input" id="${id}" type="${f.inputType === 'email' ? 'email' : 'text'}" name="${name}"${req}${len}>`;
  }

  // Checkbox/radio: naslov nije <label> (vise inputa) -> role=group + aria-labelledby
  const isGroup = f.type === 'checkbox' || f.type === 'radio';
  const titleTag = isGroup
    ? `<div class="infostone-question-title" id="${id}-title">${title}${star(f)}</div>`
    : `<label class="infostone-question-title" for="${id}">${title}${star(f)}</label>`;

  return `<div class="infostone-question" data-field="${name}"${isGroup ? ` role="group" aria-labelledby="${id}-title"` : ''}>
        ${titleTag}
        ${body}
      </div>`;
}

module.exports = {
  script: 'form.js',
  markup: (component) => `
  <form class="infostone-form" enctype="multipart/form-data" novalidate>
    <div class="infostone-header">
      <h2 class="infostone-title">${escapeHtml(component.title)}</h2>
    </div>
    <div class="infostone-fields">
      ${(component.schema?.fields || []).map(question).join('\n      ')}
    </div>
    <div class="infostone-actions">
      <button type="submit" class="infostone-submit">Posalji</button>
    </div>
    <p class="infostone-message" hidden></p>
  </form>`,
};
