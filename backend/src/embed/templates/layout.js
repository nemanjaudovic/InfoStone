// Zajednicki omotac za svaki iframe.
// U sredini je `markup`: ili Gemma spoj (component.styledHtml) ili sirov HTML iz template-a.
// Sve sto je PRAVILO (watermark, prompt box, config, skripte) dodaje server OVDE, posle Gemme,
// da model ne bi mogao da ih izostavi ili izmeni.
const escapeHtml = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Prompt box pravila (guide §3.4): form NIKAD, ostali samo paid; search ga uvek ima (paid)
// PRIVREMENO (dogovor tima): search i chatbot rade i za free plan, jer jos nema nacina da se
// postane paid. Za povratak na guide §3.4 postaviti SEARCH_FREE_FOR_ALL = false.
// Isto pravilo koristi i /api/prompt (routes/prompt.routes.js).
const SEARCH_FREE_FOR_ALL = true;
const ALWAYS_PROMPT_TYPES = ['search', 'chatbot']; // polje za pitanje JE komponenta
const showPromptBox = (component, plan) => {
  if (component.type === 'form') return false;
  if (ALWAYS_PROMPT_TYPES.includes(component.type)) return SEARCH_FREE_FOR_ALL || plan === 'paid';
  return plan === 'paid' && component.promptEnabled;
};

// Gemma izlaz je nepouzdan: izbaci <script> i inline event handlere (onclick=...)
const sanitizeStyledHtml = (html = '') =>
  String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, '');

/**
 * @param {object} component  dokument iz kolekcije components
 * @param {object} opts       { plan, markup, script, extraHead }
 */
// Osnovni izgled forme (kao form builder u dashboard-u / Google Forms).
// :where() ima specificnost 0, pa SVAKO pravilo iz CSS-a sajta (cak i "input {...}") ima prednost.
const BASE_FORM_CSS = `
:where(body.infostone-type-form) { margin: 0; padding: 16px; background: #f1f3f4; color: #202124;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
:where(.infostone-form) { max-width: 680px; margin: 0 auto; display: flex; flex-direction: column; gap: 12px; }
:where(.infostone-header), :where(.infostone-question) { background: #fff; color: #202124; border: 1px solid #dadce0;
  border-radius: 8px; padding: 20px 24px; } /* sopstvena boja teksta: citljivo i na tamnom sajtu */
:where(.infostone-header) { border-top: 8px solid #4285f4; }
:where(.infostone-title) { margin: 0; font-size: 28px; font-weight: 600; }
:where(.infostone-note) { margin: 10px 0 0; font-size: 13px; opacity: .75; }
:where(.infostone-fields) { display: flex; flex-direction: column; gap: 12px; }
:where(.infostone-question) { display: flex; flex-direction: column; gap: 12px; }
:where(.infostone-question-title) { font-size: 16px; font-weight: 600; }
:where(.infostone-required) { color: #d93025; }
:where(.infostone-answer) { width: 100%; box-sizing: border-box; padding: 9px 12px; font: inherit; color: inherit;
  background: transparent; border: 1px solid #dadce0; border-radius: 5px; }
:where(textarea.infostone-answer) { resize: vertical; min-height: 80px; }
:where(.infostone-options) { display: flex; flex-direction: column; gap: 10px; }
:where(.infostone-option) { display: flex; align-items: center; gap: 10px; cursor: pointer; }
:where(.infostone-file) { display: flex; flex-direction: column; gap: 6px; padding: 14px; border: 1px dashed #dadce0;
  border-radius: 5px; text-align: center; }
:where(.infostone-file-hint) { font-size: 12px; opacity: .7; }
:where(.infostone-actions) { display: flex; }
:where(.infostone-submit) { padding: 10px 24px; font: inherit; font-weight: 600; color: #fff; background: #4285f4;
  border: 0; border-radius: 5px; cursor: pointer; }
:where(.infostone-error) { color: #d93025; font-size: 13px; }
:where(.infostone-invalid) { border-color: #d93025; }
:where(.infostone-message) { margin: 0; padding: 14px 16px; border-radius: 8px; background: #e6f4ea; color: #137333; }
:where(.infostone-message-error) { background: #fce8e6; color: #c5221f; }
`;

// Osnovni izgled tabele; CSS sajta (ako je primenjen) uvek ima prednost
const BASE_TABLE_CSS = `
:where(body.infostone-type-tableview) { margin: 0; padding: 16px; background: #f1f3f4; color: #202124;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
:where(.infostone-tableview) { max-width: 980px; margin: 0 auto; display: flex; flex-direction: column; gap: 12px; }
:where(.infostone-table-header) { background: #fff; color: #202124; border: 1px solid #dadce0; border-top: 8px solid #4285f4;
  border-radius: 8px; padding: 18px 22px; }
:where(.infostone-title) { margin: 0; font-size: 24px; font-weight: 600; }
:where(.infostone-note) { margin: 6px 0 0; font-size: 13px; opacity: .7; }
:where(.infostone-table-search) { box-sizing: border-box; width: 100%; max-width: 320px; padding: 9px 12px; font: inherit;
  border: 1px solid #dadce0; border-radius: 6px; background: #fff; color: inherit; }
:where(.infostone-table-wrap) { overflow: auto; border-radius: 8px; }
:where(.infostone-table) { width: 100%; border-collapse: collapse; font-size: 14px; }
:where(.infostone-th) { text-align: left; padding: 10px 14px; font-weight: 600; white-space: nowrap;
  border-bottom: 1px solid #dadce0; cursor: pointer; user-select: none; }
/* Bele povrsine samo kad CSS sajta NIJE primenjen; inace tabela preuzima boje sajta */
:where(body:not(.infostone-styled)) :where(.infostone-table-wrap) { background: #fff; border: 1px solid #dadce0; }
:where(body:not(.infostone-styled)) :where(.infostone-table) { color: #202124; }
:where(body:not(.infostone-styled)) :where(.infostone-th) { background: #f8f9fa; }
:where(.infostone-td) { padding: 9px 14px; border-bottom: 1px solid #eceff1; vertical-align: top; }
:where(tbody .infostone-tr:hover) { background: rgba(66, 133, 244, .06); }
:where(.infostone-empty) { margin: 0; padding: 16px; text-align: center; opacity: .7; }
`;

function layout(component, { plan, markup, script, extraHead = '' }) {
  // Config koji citaju skripte u /embed-assets (bez osetljivih polja!)
  const cfg = {
    id: String(component._id),
    type: component.type,
    title: component.title,
    schema: component.schema,
    promptBox: showPromptBox(component, plan),
  };
  const watermark = plan === 'paid' ? '' : '<div class="infostone-watermark">Powered by InfoStone.</div>';

  return `<!doctype html>
<html lang="sr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(component.title)}</title>
  ${component.type === 'form' ? `<style>${BASE_FORM_CSS}</style>` : ''}
  ${component.type === 'tableview' ? `<style>${BASE_TABLE_CSS}</style>` : ''}
  ${extraHead}
</head>
<body class="infostone-embed infostone-type-${component.type}${component.styledHtml ? ' infostone-styled' : ''}">
  ${markup}
  ${watermark}
  <style>
    /* Posle Gemma stila i sa !important, da ga CSS organizacije ne pregazi */
    .infostone-watermark { position: fixed !important; right: 8px; bottom: 4px; display: block !important;
      font: 11px sans-serif; opacity: .6 !important; visibility: visible !important; }
    ${cfg.promptBox ? '' : '.infostone-prompt { display: none !important; }'}
    [hidden] { display: none !important; } /* form.js sakriva elemente; CSS sajta ne sme to da pregazi */
  </style>
  <script id="infostone-config" type="application/json">${JSON.stringify(cfg).replace(/</g, '\\u003c')}</script>
  <script src="/embed-assets/common.js"></script>
  ${script ? `<script src="/embed-assets/${script}"></script>` : ''}
</body>
</html>`;
}

module.exports = { layout, escapeHtml, showPromptBox, sanitizeStyledHtml };
