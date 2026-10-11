// Search (guide §4.3): AI pretraga INTERNETA, prompt box obavezan
const { escapeHtml } = require('./layout');

// Osnovni izgled; :where() ima specificnost 0, pa CSS sajta organizacije uvek ima prednost
const BASE_SEARCH_CSS = `
:where(body.infostone-type-search) { margin: 0; padding: 16px; background: #f1f3f4; color: #202124;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
:where(.infostone-search) { max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; gap: 12px; }
:where(.infostone-title) { margin: 0; font-size: 24px; font-weight: 600; }
:where(.infostone-prompt) { display: flex; gap: 8px; }
:where(.infostone-prompt-input) { flex: 1; min-width: 0; padding: 10px 12px; font: inherit; color: inherit;
  background: #fff; border: 1px solid #dadce0; border-radius: 6px; }
:where(.infostone-prompt-btn) { padding: 10px 20px; font: inherit; font-weight: 600; color: #fff; background: #4285f4;
  border: 0; border-radius: 6px; cursor: pointer; }
:where(.infostone-prompt-btn:disabled) { opacity: .6; cursor: default; }
:where(.infostone-summary) { margin: 0; font-size: 14px; }
:where(.infostone-summary:empty) { display: none; }
:where(.infostone-summary-error) { color: #c5221f; }
:where(.infostone-loading .infostone-summary) { opacity: .7; }
:where(.infostone-results) { display: flex; flex-direction: column; gap: 10px; }
:where(.infostone-card) { background: #fff; color: #202124; border: 1px solid #dadce0; border-radius: 8px; padding: 14px 16px; }
:where(.infostone-card-head) { display: flex; align-items: center; gap: 8px; }
:where(.infostone-card-icon) { width: 16px; height: 16px; flex: none; }
:where(.infostone-card-title) { flex: 1; font-weight: 600; color: #1a0dab; text-decoration: none; }
:where(a.infostone-card-title:hover) { text-decoration: underline; }
:where(.infostone-card-score) { font-size: 12px; color: #137333; background: #e6f4ea; border-radius: 999px; padding: 2px 8px; }
:where(.infostone-card-meta) { margin-top: 4px; font-size: 12px; opacity: .7; }
:where(.infostone-card-summary) { margin: 8px 0 0; font-size: 14px; line-height: 1.45; }
:where(.infostone-card-details) { margin: 6px 0 0; padding-left: 18px; font-size: 13px; }
`;

module.exports = {
  script: 'search.js',
  extraHead: `<style>${BASE_SEARCH_CSS}</style>`,
  markup: (component) => `
  <div class="infostone-search">
    <h2 class="infostone-title">${escapeHtml(component.title)}</h2>
    <form class="infostone-prompt">
      <input class="infostone-prompt-input" maxlength="500" placeholder="npr. Prostor za 150 ljudi u Beogradu do 500EUR">
      <button class="infostone-prompt-btn">Pretrazi</button>
    </form>
    <p class="infostone-summary"></p>
    <div class="infostone-results"><!-- kartice: naslov, AI sazetak, link, favicon --></div>
  </div>`,
};
