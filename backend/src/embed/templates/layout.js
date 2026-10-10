// Zajednicki omotac za svaki iframe.
// U sredini je `markup`: ili Gemma spoj (component.styledHtml) ili sirov HTML iz template-a.
// Sve sto je PRAVILO (watermark, prompt box, config, skripte) dodaje server OVDE, posle Gemme,
// da model ne bi mogao da ih izostavi ili izmeni.
const escapeHtml = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Prompt box pravila (guide §3.4): form NIKAD, ostali samo paid; search ga uvek ima (paid)
const showPromptBox = (component, plan) =>
  component.type !== 'form' && plan === 'paid' && (component.type === 'search' || component.promptEnabled);

// Gemma izlaz je nepouzdan: izbaci <script> i inline event handlere (onclick=...)
const sanitizeStyledHtml = (html = '') =>
  String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, '');

/**
 * @param {object} component  dokument iz kolekcije components
 * @param {object} opts       { plan, markup, script, extraHead }
 */
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
  ${extraHead}
</head>
<body class="infostone-embed infostone-type-${component.type}">
  ${markup}
  ${watermark}
  <style>
    /* Posle Gemma stila i sa !important, da ga CSS organizacije ne pregazi */
    .infostone-watermark { position: fixed !important; right: 8px; bottom: 4px; display: block !important;
      font: 11px sans-serif; opacity: .6 !important; visibility: visible !important; }
    ${cfg.promptBox ? '' : '.infostone-prompt { display: none !important; }'}
  </style>
  <script id="infostone-config" type="application/json">${JSON.stringify(cfg).replace(/</g, '\\u003c')}</script>
  <script src="/embed-assets/common.js"></script>
  ${script ? `<script src="/embed-assets/${script}"></script>` : ''}
</body>
</html>`;
}

module.exports = { layout, escapeHtml, showPromptBox, sanitizeStyledHtml };
