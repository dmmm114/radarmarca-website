'use strict';
/* =====================================================================
   RADAR MARCA 5.0 · ALTERNATIVA A — "CLARO"
   Um radar compacto que conta a história em 4 s (varre → deteta → o alerta
   chega), navegação que muda de noite para papel, reveals curtos, e a
   intenção do hero a seguir para o formulário. Sem bibliotecas.
   Sem JS / com reduced-motion: todo o conteúdo fica visível.
   ===================================================================== */
(function(){
  const reduce = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  const body = document.body;
  if(!reduce) body.classList.add('motion');

  /* ---------- navegação: noite sobre o hero, papel a partir daí ---------- */
  const nav = document.getElementById('nav');
  const hero = document.getElementById('topo');
  let navTick = false;
  function navState(){
    navTick = false;
    if(!nav || !hero) return;
    nav.classList.toggle('solid', window.scrollY > hero.offsetHeight - 72);
  }
  window.addEventListener('scroll', function(){ if(!navTick){ navTick = true; requestAnimationFrame(navState); } }, {passive:true});
  window.addEventListener('resize', navState, {passive:true});
  navState();

  /* ---------- reveals + linha do tempo (uma vez, curto) ---------- */
  const reveals = document.querySelectorAll('.reveal');
  const timeline = document.getElementById('timeline');
  if(!reduce && 'IntersectionObserver' in window){
    const io = new IntersectionObserver(function(entries){
      let i = 0;
      entries.forEach(function(en){
        if(!en.isIntersecting) return;
        en.target.style.transitionDelay = Math.min(i, 5) * 70 + 'ms';
        en.target.classList.add('in');
        io.unobserve(en.target); i++;
      });
    }, {rootMargin:'0px 0px -10% 0px', threshold:0});
    reveals.forEach(function(el){ io.observe(el); });
    if(timeline){
      const io2 = new IntersectionObserver(function(en){
        if(!en.some(function(e){ return e.isIntersecting; })) return;
        timeline.classList.add('on'); io2.disconnect();
      }, {rootMargin:'0px 0px -22% 0px', threshold:0});
      io2.observe(timeline);
    }
  } else {
    reveals.forEach(function(el){ el.classList.add('in'); });
    if(timeline) timeline.classList.add('on');
  }

  /* ---------- a intenção do hero segue para o formulário ---------- */
  const form = document.getElementById('cform');
  const fBrand = document.getElementById('f-brand');
  const fEmail = document.getElementById('f-email');
  const start = document.getElementById('start');
  const startBrand = document.getElementById('startBrand');
  const submitBtn = document.getElementById('cform-submit');
  function setIntent(v){
    if(!form) return;
    const r = form.querySelector('input[name="interesse"][value="' + v + '"]');
    if(r){ r.checked = true; syncSubmit(); }
  }
  function syncSubmit(){
    if(!form || !submitBtn) return;
    const v = (form.querySelector('input[name="interesse"]:checked') || {}).value;
    submitBtn.textContent = v === 'registo' ? 'Pedir o valor total do registo' : 'Enviar pedido de ativação';
  }
  if(form){
    form.querySelectorAll('input[name="interesse"]').forEach(function(r){ r.addEventListener('change', syncSubmit); });
    syncSubmit();
  }
  if(start){
    start.addEventListener('submit', function(e){
      e.preventDefault();
      const v = (startBrand && startBrand.value || '').trim();
      if(fBrand && v) fBrand.value = v;
      setIntent('vigilância');
      const target = document.getElementById('contacto');
      if(target) target.scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block:'start'});
      setTimeout(function(){ const f = (v ? fEmail : fBrand); if(f) f.focus({preventScroll:true}); }, reduce ? 0 : 750);
    });
    if(startBrand && fBrand){
      startBrand.addEventListener('input', function(){ fBrand.value = startBrand.value; });
      fBrand.addEventListener('input', function(){ startBrand.value = fBrand.value; });
    }
  }
  document.querySelectorAll('a[data-intent]').forEach(function(a){
    a.addEventListener('click', function(){ setIntent(a.dataset.intent === 'registo' ? 'registo' : 'vigilância'); });
  });

  /* ---------- formulário (Formspree) ---------- */
  if(form){
    const success = document.getElementById('cform-success');
    form.addEventListener('submit', async function(e){
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      if(!data.name || !data.email || !data.marca){ form.reportValidity(); return; }
      const orig = submitBtn.textContent; submitBtn.disabled = true; submitBtn.textContent = 'A enviar…';
      try{
        const fd = new FormData();
        fd.append('name', data.name);
        fd.append('email', data.email);
        fd.append('_replyto', data.email);
        fd.append('_subject', 'Pedido Radar Marca — ' + data.marca + ' · ' + (data.interesse || 'vigilância'));
        fd.append('telefone', data.telefone || '');
        fd.append('marca', data.marca);
        fd.append('interesse', data.interesse || 'vigilância');
        fd.append('mensagem', data.mensagem || '');
        fd.append('_gotcha', data._gotcha || '');
        const res = await fetch('https://formspree.io/f/xbdwbqov', {method:'POST', headers:{'Accept':'application/json'}, body:fd});
        if(!res.ok) throw new Error('fail');
        form.style.display = 'none';
        if(success){ success.classList.add('show'); success.scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block:'center'}); }
      }catch(err){
        alert('Não foi possível enviar agora. Tente novamente ou contacte-nos em geral@radarmarca.pt');
        submitBtn.disabled = false; submitBtn.textContent = orig;
      }
    });
  }

  /* ---------- o radar compacto: varre → deteta → o alerta chega ---------- */
  const canvas = document.getElementById('miniRadar');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const TAU = Math.PI * 2;
  const mail = document.getElementById('mailCard');
  const pct = document.getElementById('pct');
  let S = 0;
  function size(){
    const r = canvas.getBoundingClientRect();
    const d = Math.min(window.devicePixelRatio || 1, 2);
    S = r.width || 176;
    canvas.width = Math.round(S * d); canvas.height = Math.round(S * d);
    ctx.setTransform(d, 0, 0, d, 0, 0);
  }
  size();
  window.addEventListener('resize', function(){ size(); if(reduce) draw(performance.now()); }, {passive:true});

  const PERIOD = 3600;                       /* ms por volta — a história cabe em 4 s */
  const LOOK = {a:-0.72, r:.6};              /* o pedido parecido */
  const START = LOOK.a - (1300 / PERIOD) * TAU; /* o feixe apanha-o aos 1,3 s */
  const blips = [{a:-2.25,r:.52},{a:1.95,r:.7},{a:2.75,r:.42},{a:0.55,r:.8},{a:-1.35,r:.32}];
  let arrived = false, t0 = null, lastK = -1, hitAt = -1e9, locked = false;
  function arrive(){ if(arrived) return; arrived = true; if(mail) mail.classList.add('arrived'); }
  setTimeout(arrive, 2800);                  /* nunca fica preso: o alerta chega mesmo sem canvas */

  function draw(now){
    if(t0 === null) t0 = now;
    const t = now - t0;
    const cx = S / 2, cy = S / 2, R = S / 2 - 12;
    const sweep = reduce ? LOOK.a + 0.35 : START + (t / PERIOD) * TAU;
    if(reduce){ locked = true; hitAt = now - 450; }
    else {
      const k = Math.floor((sweep - LOOK.a) / TAU);
      if(k !== lastK){ if(lastK !== -1 || k > 0){ hitAt = now; locked = true; arrive(); if(pct){ pct.classList.remove('pulse'); void pct.offsetWidth; pct.classList.add('pulse'); } } lastK = k; }
    }
    const hit = Math.max(0, 1 - (now - hitAt) / 1100);

    ctx.clearRect(0, 0, S, S);
    /* anéis + cruz, tungsténio */
    ctx.lineWidth = 1;
    for(let i = 1; i <= 4; i++){
      ctx.beginPath(); ctx.arc(cx, cy, R * i / 4, 0, TAU);
      ctx.strokeStyle = 'rgba(241,228,195,' + (0.16 - i * 0.02) + ')'; ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(241,228,195,.08)';
    ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();
    ctx.strokeStyle = 'rgba(241,228,195,.3)';
    for(let g = 0; g < 24; g++){
      const ga = g / 24 * TAU, r1 = R * 0.985, r2 = (g % 6 === 0) ? R * 0.92 : R * 0.955;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(ga) * r1, cy + Math.sin(ga) * r1); ctx.lineTo(cx + Math.cos(ga) * r2, cy + Math.sin(ga) * r2); ctx.stroke();
    }
    /* varrimento com rasto */
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(sweep);
    if(ctx.createConicGradient){
      const cg = ctx.createConicGradient(0, 0, 0);
      cg.addColorStop(0, 'rgba(241,228,195,.42)');
      cg.addColorStop(0.03, 'rgba(241,228,195,0)');
      cg.addColorStop(0.62, 'rgba(241,228,195,0)');
      cg.addColorStop(1, 'rgba(241,228,195,.30)');
      ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fillStyle = cg; ctx.fill();
    } else {
      const g = ctx.createLinearGradient(0, 0, R, 0);
      g.addColorStop(0, 'rgba(241,228,195,.3)'); g.addColorStop(1, 'rgba(241,228,195,0)');
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, -0.6, 0.02); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
    }
    ctx.strokeStyle = 'rgba(217,164,65,.85)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(R, 0); ctx.stroke();
    ctx.restore();
    /* centro = a sua marca */
    ctx.beginPath(); ctx.arc(cx, cy, 3.6, 0, TAU);
    ctx.fillStyle = '#D9A441'; ctx.shadowColor = '#D9A441'; ctx.shadowBlur = 14; ctx.fill(); ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(cx, cy, 8, 0, TAU); ctx.strokeStyle = 'rgba(217,164,65,.45)'; ctx.lineWidth = 1; ctx.stroke();
    /* blips calmos acendem à passagem */
    const sa = ((sweep % TAU) + TAU) % TAU;
    for(const b of blips){
      const bx = cx + Math.cos(b.a) * R * b.r, by = cy + Math.sin(b.a) * R * b.r;
      let d = Math.abs(sa - ((b.a % TAU + TAU) % TAU)); if(d > Math.PI) d = TAU - d;
      const lit = Math.max(0, 1 - d * 1.5);
      ctx.beginPath(); ctx.arc(bx, by, 1.8 + lit * 1.4, 0, TAU);
      ctx.fillStyle = 'rgba(241,228,195,' + (0.22 + lit * 0.6) + ')'; ctx.fill();
    }
    /* o pedido parecido: âmbar, onda de deteção e mira fechada */
    const lx = cx + Math.cos(LOOK.a) * R * LOOK.r, ly = cy + Math.sin(LOOK.a) * R * LOOK.r;
    if(locked){
      const e = 1 - Math.pow(1 - Math.min(1, (now - hitAt) / 700), 3);
      const dist = 7 + (1 - e) * 22, L = 5;
      ctx.strokeStyle = 'rgba(242,197,107,' + (0.55 + 0.45 * hit) + ')'; ctx.lineWidth = 1.5;
      [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(function(c){
        ctx.beginPath();
        ctx.moveTo(lx + c[0] * dist - c[0] * L, ly + c[1] * dist);
        ctx.lineTo(lx + c[0] * dist, ly + c[1] * dist);
        ctx.lineTo(lx + c[0] * dist, ly + c[1] * dist - c[1] * L);
        ctx.stroke();
      });
      if(hit > 0){
        ctx.beginPath(); ctx.arc(lx, ly, 6 + (1 - hit) * 30, 0, TAU);
        ctx.strokeStyle = 'rgba(242,197,107,' + (hit * 0.8) + ')'; ctx.lineWidth = 1.3; ctx.stroke();
      }
    }
    ctx.beginPath(); ctx.arc(lx, ly, 3.4 + hit * 1.2, 0, TAU);
    ctx.fillStyle = locked ? '#F2C56B' : 'rgba(241,228,195,.5)';
    if(locked){ ctx.shadowColor = '#F2C56B'; ctx.shadowBlur = 16 + hit * 10; }
    ctx.fill(); ctx.shadowBlur = 0;

    if(!reduce) requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();
