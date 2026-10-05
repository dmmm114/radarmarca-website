/* flyer.html — página de destino do QR do flyer A5.
 * Envia para o mesmo Formspree do site, acrescentando a origem (flyer) e os UTM do QR,
 * para os pedidos do flyer se distinguirem dos do site. */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('fform');
  if (!form) return;
  const btn = document.getElementById('fform-submit');
  const err = document.getElementById('fform-error');
  const done = document.getElementById('fform-done');
  const regField = document.getElementById('reg-field');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // UTM do QR (utm_source=flyer&utm_medium=print&utm_campaign=a5-2026&utm_content=frente|verso); por omissão, "flyer"
  const qs = new URLSearchParams(location.search);
  const utm = {
    utm_source: qs.get('utm_source') || 'flyer',
    utm_medium: qs.get('utm_medium') || '',
    utm_campaign: qs.get('utm_campaign') || '',
    utm_content: qs.get('utm_content') || '',   // frente (vigilância) | verso (registo)
  };

  // o QR do verso do flyer é o do registo: chega com "Registar a minha marca" já escolhido
  if (utm.utm_content === 'verso') {
    const reg = form.querySelector('input[name="interesse"][value="registo"]');
    if (reg) reg.checked = true;
  }

  // o n.º de registo só faz sentido para quem já tem a marca registada (vigilância)
  const syncRegField = () => {
    const v = (form.querySelector('input[name="interesse"]:checked') || {}).value;
    regField.hidden = v !== 'vigilância';
  };
  form.querySelectorAll('input[name="interesse"]').forEach((r) => r.addEventListener('change', syncRegField));
  syncRegField();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.classList.remove('show');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const data = Object.fromEntries(new FormData(form).entries());
    const interesse = data.interesse || 'vigilância';
    const orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'A enviar…';
    try {
      const fd = new FormData();
      fd.append('name', data.name);
      fd.append('email', data.email);
      fd.append('_replyto', data.email);
      fd.append('_subject', 'Pedido Radar Marca (flyer) — ' + data.marca + ' · ' + interesse);
      fd.append('telefone', data.telefone || '');
      fd.append('marca', data.marca);
      fd.append('interesse', interesse);
      if (interesse === 'vigilância' && data.processo_inpi) fd.append('processo_inpi', data.processo_inpi);
      fd.append('mensagem', data.mensagem || '');
      fd.append('origem', 'flyer-a5');
      Object.entries(utm).forEach(([k, v]) => v && fd.append(k, v));
      fd.append('_gotcha', data._gotcha || '');
      const res = await fetch(form.action, { method: 'POST', headers: { Accept: 'application/json' }, body: fd });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      form.hidden = true;
      done.classList.add('show');
      done.focus({ preventScroll: true });
      done.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    } catch (_) {
      err.classList.add('show');
      btn.disabled = false; btn.textContent = orig;
    }
  });
});
