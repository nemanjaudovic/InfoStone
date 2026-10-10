// Table View (guide §4.2): sort, paginacija, klasicna pretraga, prompt box (paid)
const { escapeHtml } = require('./layout');

module.exports = {
  script: 'tableview.js',
  markup: (component) => `
  <div class="infostone-tableview">
    <h2 class="infostone-title">${escapeHtml(component.title)}</h2>
    <div class="infostone-prompt">
      <input class="infostone-prompt-input" placeholder="npr. Prikazi samo ljude iz Beograda">
      <button class="infostone-prompt-btn">Primeni</button>
    </div>
    <input class="infostone-table-search" placeholder="Pretraga...">
    <table class="infostone-table"><thead></thead><tbody></tbody></table>
    <div class="infostone-pagination"></div>
  </div>`,
};
