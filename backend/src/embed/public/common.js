// Zajednicko za sve iframe-ove: config, API helper, auto-height preko postMessage
window.InfoStone = (function () {
  const config = JSON.parse(document.getElementById('infostone-config').textContent);

  // Iframe je na istom originu kao API (localhost:3000), pa nema CORS-a
  async function api(path, options = {}) {
    const res = await fetch(path, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || `HTTP ${res.status}`);
      err.status = res.status;
      err.data = data; // npr. data.fields = { imePolja: "poruka" } kod validacije na serveru
      throw err;
    }
    return data;
  }

  // Javlja roditeljskom sajtu visinu sadrzaja (mock sajt podesava visinu iframe-a)
  function reportHeight() {
    parent.postMessage({ infostone: true, id: config.id, height: document.documentElement.scrollHeight }, '*');
  }
  new ResizeObserver(reportHeight).observe(document.body);
  window.addEventListener('load', reportHeight);

  return { config, api, reportHeight };
})();
