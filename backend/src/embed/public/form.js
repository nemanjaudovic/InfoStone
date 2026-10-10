// Ponasanje forme u iframe-u
(function () {
  const { config, api } = window.InfoStone;
  const form = document.querySelector('.infostone-form');

  // TODO: renderuj polja iz config.schema.fields (text, textarea, checkbox, radio, file)
  // TODO: validacija (required, min/max length, email)

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    // TODO: api(`/api/submit/${config.id}`, { method: 'POST', body: new FormData(form) })
    //       -> prikazi poruku zahvalnosti (+ opciono CV coach izvestaj)
  });
})();
