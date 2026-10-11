// Ponasanje chatbot-a u iframe-u: poruke posetioca i odgovori bota.
// Pitanje -> POST /api/prompt/:id { prompt, history } -> { answer, sources: [{ heading, url }], mode }
// history = poslednja 3 para pitanje/odgovor (za "a koliko to kosta?").
// Odgovor dolazi od modela: sve se upisuje kroz textContent, nikad innerHTML.
// Ako Gemma (styledHtml) izmeni klase, koriste se rezervni selektori kao u form.js.
(function () {
  const { config, api, reportHeight } = window.InfoStone;
  const root = document.querySelector('.infostone-chatbot') || document.body;
  const form = root.querySelector('.infostone-prompt') || root.querySelector('form');
  const input = form && (form.querySelector('.infostone-prompt-input') || form.querySelector('input, textarea'));
  const button = form && (form.querySelector('.infostone-prompt-btn') || form.querySelector('button'));
  let log = root.querySelector('.infostone-chat-log');
  if (!log) {
    log = document.createElement('div');
    log.className = 'infostone-chat-log';
    root.insertBefore(log, form || null);
  }

  const MAX_HISTORY = 3;
  const history = [];
  const GREETING = (config.schema && config.schema.greeting) ||
    'Zdravo! Pitaj me bilo sta o nama i nasim dogadjajima.';

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  // Samo http(s) linkovi; izvor iz otpremljenog fajla (npr. "o-nama.html") ostaje samo naslov
  const safeUrl = (url) => {
    try {
      const u = new URL(url);
      return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
    } catch {
      return null;
    }
  };

  function addMessage(text, who, extraClass) {
    const msg = el('div', `infostone-msg infostone-msg-${who}${extraClass ? ` ${extraClass}` : ''}`, text);
    log.appendChild(msg);
    log.scrollTop = log.scrollHeight;
    reportHeight();
    return msg;
  }

  function addSources(msg, sources) {
    const unique = [];
    for (const s of sources || []) {
      if (s && s.heading && !unique.some((u) => u.heading === s.heading)) unique.push(s);
    }
    if (!unique.length) return;
    const box = el('span', 'infostone-msg-sources', 'Izvor: ');
    unique.forEach((s, i) => {
      if (i) box.appendChild(document.createTextNode(', '));
      const url = safeUrl(s.url);
      const node = el(url ? 'a' : 'span', '', s.heading);
      if (url) {
        node.href = url;
        node.target = '_blank';
        node.rel = 'noopener noreferrer';
      }
      box.appendChild(node);
    });
    msg.appendChild(box);
  }

  addMessage(GREETING, 'bot');
  if (!form || !input) return;
  if (!config.promptBox) {
    addMessage('Chatbot je dostupan samo u placenom planu.', 'bot', 'infostone-msg-error');
    input.disabled = true;
    if (button) button.disabled = true;
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const question = input.value.trim();
    if (!question) return;

    input.value = '';
    input.disabled = true;
    if (button) button.disabled = true;
    addMessage(question, 'user');
    const typing = addMessage('Kucam odgovor…', 'bot', 'infostone-msg-typing');

    try {
      const data = await api(`/api/prompt/${config.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: question, history: history.slice(-MAX_HISTORY) }),
      });
      typing.remove();
      const answer = data.answer || 'Nemam odgovor na ovo pitanje.';
      addSources(addMessage(answer, 'bot'), data.sources);
      history.push({ question, answer });
    } catch (err) {
      typing.remove();
      const text =
        err.status === 429 ? 'Previse pitanja u kratkom roku, probaj ponovo za minut.'
        : err.status === 409 ? 'Chatbot jos nije podesen. Pokusaj kasnije.'
        : err.message || 'Doslo je do greske, pokusaj ponovo.';
      addMessage(text, 'bot', 'infostone-msg-error');
    } finally {
      input.disabled = false;
      if (button) button.disabled = false;
      input.focus();
      reportHeight();
    }
  });
})();
