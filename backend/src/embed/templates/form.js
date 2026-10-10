// Form (guide §4.1): text, textarea, checkbox, radio, file. NEMA prompt box.
// markup() je sirov HTML forme: on se salje Gemmi na "Primeni stil" i prikazuje dok stil nije primenjen.
// Klase infostone-* i name atributi su ugovor sa form.js skriptom — Gemma ih ne sme menjati.
const { escapeHtml } = require('./layout');

function field(f) {
  const name = escapeHtml(f.name);
  const label = escapeHtml(f.label || f.name);
  const req = f.required ? ' required' : '';
  const len = `${f.minLength ? ` minlength="${f.minLength}"` : ''}${f.maxLength ? ` maxlength="${f.maxLength}"` : ''}`;
  const options = f.options || [];

  switch (f.type) {
    case 'textarea':
      return `<label class="infostone-label">${label}<textarea class="infostone-input" name="${name}"${req}${len}></textarea></label>`;
    case 'checkbox':
    case 'radio':
      return `<fieldset class="infostone-group"><legend class="infostone-label">${label}</legend>${options
        .map((o) => `<label class="infostone-option"><input type="${f.type}" name="${name}" value="${escapeHtml(o)}"> ${escapeHtml(o)}</label>`)
        .join('')}</fieldset>`;
    case 'file':
      return `<label class="infostone-label">${label}<input class="infostone-input" type="file" name="${name}" accept=".pdf,.docx,.png,.jpg,.jpeg"${req}></label>`;
    default: // text
      return `<label class="infostone-label">${label}<input class="infostone-input" type="${f.inputType === 'email' ? 'email' : 'text'}" name="${name}"${req}${len}></label>`;
  }
}

module.exports = {
  script: 'form.js',
  markup: (component) => `
  <form class="infostone-form" enctype="multipart/form-data" novalidate>
    <h2 class="infostone-title">${escapeHtml(component.title)}</h2>
    <div class="infostone-fields">
      ${(component.schema?.fields || []).map(field).join('\n      ')}
    </div>
    <button type="submit" class="infostone-submit">Posalji</button>
    <p class="infostone-message" hidden></p>
  </form>`,
};
