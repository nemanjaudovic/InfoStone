// Ponasanje AI web pretrage u iframe-u (guide §4.3).
// Prompt -> POST /api/prompt/:id -> { summary, results: [{ title, url, snippet, relevance, location, details }] }
// -> sazetak na vrhu + kartice sa linkom u novom tabu.
// Sadrzaj dolazi sa interneta (preko Gemme): sve se upisuje kroz textContent, nikad innerHTML.
// Ako Gemma (styledHtml) izmeni klase, koriste se rezervni selektori kao u form.js.
(function () {
  const { config, api, reportHeight } = window.InfoStone;
  const root = document.querySelector('.infostone-search') || document.body;
  const form = root.querySelector('.infostone-prompt') || root.querySelector('form');
  const input =
    (form && (form.querySelector('.infostone-prompt-input') || form.querySelector('input, textarea'))) || null;
  const button = form && (form.querySelector('.infostone-prompt-btn') || form.querySelector('button'));

  let summary = root.querySelector('.infostone-summary');
  if (!summary) {
    summary = document.createElement('p');
    summary.className = 'infostone-summary';
    root.appendChild(summary);
  }
  let list = root.querySelector('.infostone-results');
  if (!list) {
    list = document.createElement('div');
    list.className = 'infostone-results';
    root.appendChild(list);
  }

  if (!form || !input) return;
  if (!config.promptBox) {
    summary.textContent = 'Pretraga je dostupna samo u placenom planu.';
    return;
  }

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  // Samo http(s) linkovi (javascript: i slicno iz tudjeg sadrzaja se odbacuju)
  const safeUrl = (url) => {
    try {
      const u = new URL(url);
      return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
    } catch {
      return null;
    }
  };

  function card(r) {
    const url = safeUrl(r.url);
    const box = el('article', 'infostone-card');

    const head = el('div', 'infostone-card-head');
    if (url) {
      const icon = el('img', 'infostone-card-icon');
      icon.alt = '';
      icon.src = `https://www.google.com/s2/favicons?sz=32&domain=${encodeURIComponent(new URL(url).hostname)}`;
      icon.onerror = () => icon.remove();
      head.appendChild(icon);
    }
    const title = el(url ? 'a' : 'span', 'infostone-card-title', r.title || r.url || 'Rezultat');
    if (url) {
      title.href = url;
      title.target = '_blank';
      title.rel = 'noopener noreferrer';
    }
    head.appendChild(title);
    if (typeof r.relevance === 'number') {
      head.appendChild(el('span', 'infostone-card-score', `${Math.round(r.relevance * 100)}%`));
    }
    box.appendChild(head);

    const meta = [r.location, url && new URL(url).hostname].filter(Boolean).join(' · ');
    if (meta) box.appendChild(el('div', 'infostone-card-meta', meta));
    if (r.snippet) box.appendChild(el('p', 'infostone-card-summary', r.snippet));
    if (Array.isArray(r.details) && r.details.length) {
      const ul = el('ul', 'infostone-card-details');
      r.details.forEach((d) => ul.appendChild(el('li', '', d)));
      box.appendChild(ul);
    }
    return box;
  }

  function setBusy(busy) {
    if (button) button.disabled = busy;
    input.disabled = busy;
    root.classList.toggle('infostone-loading', busy);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const prompt = input.value.trim();
    if (!prompt) return;

    setBusy(true);
    summary.classList.remove('infostone-summary-error');
    summary.textContent = 'Trazim po internetu… (moze da potraje do minut)';
    list.replaceChildren();
    reportHeight();

    try {
      const data = await api(`/api/prompt/${config.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      summary.textContent = data.summary || '';
      (data.results || []).forEach((r) => list.appendChild(card(r)));
    } catch (err) {
      summary.classList.add('infostone-summary-error');
      summary.textContent =
        err.status === 429 ? 'Previse pretraga, probaj ponovo za minut.' : err.message || 'Pretraga nije uspela.';
    } finally {
      setBusy(false);
      reportHeight();
    }
  });
})();
