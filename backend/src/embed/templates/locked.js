// Sensitive shell (guide §3.3): polje za sifru, sadrzaj se ucitava posle unlock-a
const { escapeHtml } = require('./layout');

module.exports = {
  script: 'locked.js',
  markup: (component) => `
  <form class="infostone-locked">
    <h2 class="infostone-title">${escapeHtml(component.title)}</h2>
    <input type="password" class="infostone-password" placeholder="Unesi kod">
    <button class="infostone-unlock-btn">Otkljucaj</button>
    <p class="infostone-message" hidden></p>
  </form>`,
};
