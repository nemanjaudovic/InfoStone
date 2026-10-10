// Search (guide §4.3): AI pretraga INTERNETA, prompt box obavezan
const { escapeHtml } = require('./layout');

module.exports = {
  script: 'search.js',
  markup: (component) => `
  <div class="infostone-search">
    <h2 class="infostone-title">${escapeHtml(component.title)}</h2>
    <form class="infostone-prompt">
      <input class="infostone-prompt-input" placeholder="npr. Prostor za 150 ljudi u Beogradu do 500EUR">
      <button class="infostone-prompt-btn">Pretrazi</button>
    </form>
    <p class="infostone-summary"></p>
    <div class="infostone-results"><!-- kartice: naslov, AI sazetak, link, favicon --></div>
  </div>`,
};
