// Graph (guide §4.4): pie/bar preko Chart.js, prompt box (paid)
const { escapeHtml } = require('./layout');

module.exports = {
  script: 'graph.js',
  extraHead: '<script src="/embed-assets/vendor/chart.umd.js"></script>',
  markup: (component) => `
  <div class="infostone-graph">
    <h2 class="infostone-title">${escapeHtml(component.title)}</h2>
    <div class="infostone-prompt">
      <input class="infostone-prompt-input" placeholder="npr. Broj prijava po danu">
      <button class="infostone-prompt-btn">Primeni</button>
    </div>
    <canvas class="infostone-chart"></canvas>
  </div>`,
};
