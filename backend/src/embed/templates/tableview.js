// Table View (guide §4.2): rezultat pretrage tabele (Table stranica + Gemma chatbox) kao iframe.
// Redove ucitava embed.routes.js (component._columns, component._rows) pri svakom prikazu.
// Bez redova (npr. uzorak za Gemmu na "Generate") prikazuje 2 primer reda sa istim kolonama.
// Klase infostone-* su ugovor sa embed/public/tableview.js i sa mapom klasa iz Gemme.
const { escapeHtml } = require('./layout');

function markup(component) {
  const columns = component._columns || (component.schema && component.schema.columnLabels) || [];
  const rows = component._rows || [columns.map(() => 'Primer'), columns.map(() => 'Primer')];
  const head = columns.map((c) => `<th class="infostone-th" scope="col">${escapeHtml(c)}</th>`).join('');
  const body = rows
    .map((r) => `<tr class="infostone-tr">${r.map((v) => `<td class="infostone-td">${escapeHtml(v)}</td>`).join('')}</tr>`)
    .join('\n          ');

  return `
  <div class="infostone-tableview">
    <div class="infostone-table-header">
      <h2 class="infostone-title">${escapeHtml(component.title)}</h2>
      <p class="infostone-note">${rows.length} ${rows.length === 1 ? 'red' : 'redova'}</p>
    </div>
    <div class="infostone-prompt">
      <input class="infostone-prompt-input" placeholder="npr. Prikazi samo ljude iz Beograda">
      <button class="infostone-prompt-btn">Primeni</button>
    </div>
    <input class="infostone-table-search infostone-input" type="search" placeholder="Pretraga...">
    <div class="infostone-table-wrap">
      <table class="infostone-table">
        <thead><tr class="infostone-tr">${head}</tr></thead>
        <tbody>
          ${body}
        </tbody>
      </table>
    </div>
    <p class="infostone-empty" hidden>Nema rezultata za ovu pretragu.</p>
  </div>`;
}

module.exports = { script: 'tableview.js', markup };
