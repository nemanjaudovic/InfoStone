// Chatbot (5. tip komponente): posetilac pita o organizaciji/dogadjaju, odgovor stize iz znanja
// koje je organizator napravio od svog sajta (routes/tools.routes.js). Ponasanje: public/chatbot.js
const { escapeHtml } = require('./layout');

// Osnovni izgled; :where() ima specificnost 0, pa CSS sajta organizacije uvek ima prednost.
// Kartica i poruke bota imaju SVOJU boju teksta: inace na tamnom sajtu nasledjuju svetao tekst
// sajta, a pozadina ostaje bela (nevidljiv tekst).
const BASE_CHATBOT_CSS = `
:where(body.infostone-type-chatbot) { margin: 0; padding: 16px; background: #f1f3f4; color: #202124;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
:where(.infostone-chatbot) { max-width: 560px; margin: 0 auto; display: flex; flex-direction: column; gap: 10px;
  background: #fff; color: #202124; border: 1px solid #dadce0; border-radius: 12px; padding: 16px; }
:where(.infostone-title) { margin: 0; font-size: 18px; font-weight: 600; }
:where(.infostone-chat-log) { display: flex; flex-direction: column; gap: 8px; max-height: 420px; overflow-y: auto;
  padding: 4px 2px; }
:where(.infostone-msg) { max-width: 85%; padding: 9px 12px; border-radius: 14px; font-size: 14px; line-height: 1.45;
  white-space: pre-wrap; overflow-wrap: anywhere; }
:where(.infostone-msg-bot) { align-self: flex-start; background: #f1f3f4; color: #202124; border-bottom-left-radius: 4px; }
:where(.infostone-msg-user) { align-self: flex-end; background: #4285f4; color: #fff; border-bottom-right-radius: 4px; }
:where(.infostone-msg-error) { background: #fce8e6; color: #c5221f; }
:where(.infostone-msg-typing) { opacity: .7; font-style: italic; }
:where(.infostone-msg-sources) { display: block; margin-top: 6px; font-size: 12px; opacity: .75; white-space: normal; }
:where(.infostone-msg-sources a) { color: inherit; }
:where(.infostone-prompt) { display: flex; gap: 8px; }
:where(.infostone-prompt-input) { flex: 1; min-width: 0; padding: 10px 12px; font: inherit; color: inherit;
  background: #fff; border: 1px solid #dadce0; border-radius: 20px; }
:where(.infostone-prompt-btn) { padding: 10px 18px; font: inherit; font-weight: 600; color: #fff; background: #4285f4;
  border: 0; border-radius: 20px; cursor: pointer; }
:where(.infostone-prompt-btn:disabled) { opacity: .6; cursor: default; }
`;

module.exports = {
  script: 'chatbot.js',
  extraHead: `<style>${BASE_CHATBOT_CSS}</style>`,
  markup: (component) => `
  <div class="infostone-chatbot">
    <h2 class="infostone-title">${escapeHtml(component.title)}</h2>
    <div class="infostone-chat-log" aria-live="polite"><!-- poruke dodaje chatbot.js --></div>
    <form class="infostone-prompt">
      <input type="text" class="infostone-prompt-input" name="question" maxlength="500" autocomplete="off"
             placeholder="Postavi pitanje..." aria-label="Pitanje">
      <button type="submit" class="infostone-prompt-btn">Posalji</button>
    </form>
  </div>`,
};
