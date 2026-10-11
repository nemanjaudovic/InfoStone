// Ponasanje tabele u iframe-u: pretraga, sortiranje klikom na zaglavlje, auto-height.
// Oslanja se na klase infostone-* (Gemma dodaje klase sajta, nase ostaju).
(function () {
  const { reportHeight } = window.InfoStone;
  const root = document.querySelector('.infostone-tableview') || document.body;
  const table = root.querySelector('.infostone-table') || root.querySelector('table');
  if (!table) return;
  const tbody = table.tBodies[0];
  const rows = Array.from(tbody ? tbody.rows : []);
  const search = root.querySelector('.infostone-table-search');
  const empty = root.querySelector('.infostone-empty');

  // Pretraga kroz sve celije
  function applySearch() {
    const q = (search && search.value || '').trim().toLowerCase();
    let shown = 0;
    rows.forEach((tr) => {
      const match = !q || tr.textContent.toLowerCase().includes(q);
      tr.hidden = !match;
      if (match) shown++;
    });
    if (empty) empty.hidden = shown > 0 || rows.length === 0;
    reportHeight();
  }
  if (search) search.addEventListener('input', applySearch);

  // Sortiranje: klik na zaglavlje (brojevi numericki, ostalo abecedno), drugi klik obrce smer
  const headers = Array.from(table.tHead ? table.tHead.rows[0].cells : []);
  let sortCol = -1;
  let asc = true;
  headers.forEach((th, i) => {
    th.addEventListener('click', () => {
      asc = sortCol === i ? !asc : true;
      sortCol = i;
      headers.forEach((h) => h.removeAttribute('aria-sort'));
      th.setAttribute('aria-sort', asc ? 'ascending' : 'descending');
      const val = (tr) => (tr.cells[i] ? tr.cells[i].textContent.trim() : '');
      rows.sort((a, b) => {
        const x = val(a); const y = val(b);
        const nx = Number(x); const ny = Number(y);
        const cmp = x !== '' && y !== '' && !isNaN(nx) && !isNaN(ny) ? nx - ny : x.localeCompare(y, 'sr');
        return asc ? cmp : -cmp;
      });
      rows.forEach((tr) => tbody.appendChild(tr));
    });
  });

  reportHeight();
})();
