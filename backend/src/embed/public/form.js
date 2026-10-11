// Ponasanje forme u iframe-u: validacija, slanje, poruka zahvalnosti.
// HTML forme pravi server (templates/form.js ili Gemma spoj u styledHtml);
// ova skripta se oslanja na klase infostone-* i name atribute; ako ih Gemma
// izmeni, koristi rezervne selektore (<form>, submit dugme) da forma i dalje radi.
(function () {
  const { config, api, reportHeight } = window.InfoStone;
  const form = document.querySelector('.infostone-form') || document.querySelector('form');
  if (!form) return;

  const fields = (config.schema && config.schema.fields) || [];
  const submitBtn =
    form.querySelector('.infostone-submit') ||
    form.querySelector('button[type="submit"], input[type="submit"]') ||
    form.querySelector('button');
  let message = form.querySelector('.infostone-message');
  if (!message) {
    message = document.createElement('p');
    message.className = 'infostone-message';
    message.hidden = true;
    form.appendChild(message);
  }

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB (guide §4.1)
  const ALLOWED_EXT = ['.pdf', '.docx', '.png', '.jpg', '.jpeg'];
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // --- poruke o greskama uz polje ---
  function fieldContainer(name) {
    const input = form.querySelector(`[name="${CSS.escape(name)}"]`);
    if (!input) return null;
    return (
      input.closest('.infostone-question') ||
      input.closest('[data-field]') ||
      input.closest('.infostone-group') ||
      input.closest('.infostone-label') ||
      input.parentElement
    );
  }

  function setError(name, text) {
    const box = fieldContainer(name);
    if (!box) return;
    box.classList.add('infostone-invalid');
    let err = box.querySelector(':scope > .infostone-error');
    if (!err) {
      err = document.createElement('span');
      err.className = 'infostone-error';
      err.setAttribute('role', 'alert');
      box.appendChild(err);
    }
    err.textContent = text;
  }

  function clearErrors() {
    form.querySelectorAll('.infostone-invalid').forEach((el) => el.classList.remove('infostone-invalid'));
    form.querySelectorAll('.infostone-error').forEach((el) => el.remove());
  }

  function showMessage(text, isError) {
    message.textContent = text;
    message.hidden = false;
    message.classList.toggle('infostone-message-error', !!isError);
    reportHeight();
  }

  // --- validacija po definiciji polja iz component.schema.fields ---
  function validateField(f) {
    const label = f.label || f.name;
    const inputs = form.querySelectorAll(`[name="${CSS.escape(f.name)}"]`);
    if (!inputs.length) return null;

    if (f.type === 'checkbox' || f.type === 'radio') {
      const checked = Array.from(inputs).some((i) => i.checked);
      return f.required && !checked ? `Izaberite bar jednu opciju za "${label}".` : null;
    }

    if (f.type === 'file') {
      const file = inputs[0].files[0];
      if (!file) return f.required ? `Prilozite fajl za "${label}".` : null;
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      if (!ALLOWED_EXT.includes(ext)) return `Dozvoljeni formati: ${ALLOWED_EXT.join(', ')}.`;
      if (file.size > MAX_FILE_SIZE) return 'Fajl je veci od 5MB.';
      return null;
    }

    // text / textarea
    const value = inputs[0].value.trim();
    if (!value) return f.required ? `Polje "${label}" je obavezno.` : null;
    if (f.minLength && value.length < f.minLength) return `Najmanje ${f.minLength} karaktera.`;
    if (f.maxLength && value.length > f.maxLength) return `Najvise ${f.maxLength} karaktera.`;
    if (f.inputType === 'email' && !EMAIL_RE.test(value)) return 'Unesite ispravnu email adresu.';
    return null;
  }

  function validate() {
    clearErrors();
    let firstInvalid = null;
    for (const f of fields) {
      const error = validateField(f);
      if (error) {
        setError(f.name, error);
        firstInvalid = firstInvalid || f.name;
      }
    }
    if (firstInvalid) {
      const el = form.querySelector(`[name="${CSS.escape(firstInvalid)}"]`);
      if (el) el.focus();
    }
    reportHeight();
    return !firstInvalid;
  }

  // Greska nestaje cim korisnik ispravi polje
  form.addEventListener('input', (e) => {
    const box = e.target.name && fieldContainer(e.target.name);
    if (box && box.classList.contains('infostone-invalid')) {
      box.classList.remove('infostone-invalid');
      const err = box.querySelector(':scope > .infostone-error');
      if (err) err.remove();
      reportHeight();
    }
  });

  // --- slanje ---
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    message.hidden = true;
    if (!validate()) return;

    if (submitBtn) submitBtn.disabled = true;
    try {
      // multipart: polja + fajlovi -> POST /api/submit/:componentId
      const result = await api(`/api/submit/${encodeURIComponent(config.id)}`, {
        method: 'POST',
        body: new FormData(form),
      });
      const thanks = result.thankYouMessage || (config.schema && config.schema.thankYouMessage) || 'Hvala! Vasa prijava je poslata.';
      // Sakrij sve osim poruke (radi i kad Gemma promeni raspored)
      const fieldsBox = form.querySelector('.infostone-fields');
      if (fieldsBox) fieldsBox.hidden = true;
      else Array.from(form.children).forEach((el) => { if (el !== message && !/^H[1-6]$/.test(el.tagName)) el.hidden = true; });
      if (submitBtn) submitBtn.hidden = true;
      showMessage(thanks, false);
      // TODO (CV Coach, guide §4.5): ako result.coachToken postoji -> POST /api/cv/coach/:submissionId i prikazi savete
    } catch (err) {
      // Server je odbio pojedinacna polja -> prikazi greske uz polja
      const fieldErrors = (err.data && err.data.fields) || {};
      Object.entries(fieldErrors).forEach(([name, text]) => setError(name, text));
      showMessage(`Slanje nije uspelo: ${err.message}`, true);
      if (submitBtn) submitBtn.disabled = false;
    }
  });
})();
