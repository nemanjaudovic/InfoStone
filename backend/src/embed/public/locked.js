// Unos sifre za sensitive komponentu
(function () {
  const { config, api } = window.InfoStone;
  // TODO: api(`/api/protected/${config.id}/unlock`, POST { password }) -> token
  //       -> location.href = `/api/protected/${config.id}/content?token=...`
})();
