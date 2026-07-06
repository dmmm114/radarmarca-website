'use strict';
/* =====================================================================
   RADAR VIVO CONTÍNUO
   Um único radar em <canvas> fixo que se transforma ao longo do scroll:
   hero → tese (alerta vermelho) → registo (target lock) → vigilância
   (consola) → funil (feixe/timeline) → ambiente → final (lock verde).
   ===================================================================== */
(function(){
  const reduce = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  if(reduce) document.body.classList.add('no-motion');

  const canvas = document.getElementById('radar');
  const ctx = canvas.getContext('2d');
  const isMobile = window.matchMedia('(max-width:760px)').matches;

  /* ---------- V5 · estado partilhado entre o motor do radar e o DOM ---------- */
  const RM = window.RM = {
    brand:'',            // a marca do visitante (só vive no browser dele)
    sosia:'',            // mutação determinística — o "pedido colidente" personalizado
    act2:{p:0},          // progresso do mini-filme da tese (0..1), escrito pelo ScrollTrigger
    ceremony:{on:false, t:0},
    pulse:0              // pulso do blip dourado quando o visitante escreve
  };

  /* sósia: 1 edição determinística sobre o nome — sempre etiquetado "simulação" */
  function makeSosia(name){
    const up = name.toUpperCase();
    let h = 0; for(let i=0;i<up.length;i++) h = (h*31 + up.charCodeAt(i)) >>> 0;
    const subs = [['C','K'],['K','C'],['S','Z'],['Z','S'],['I','Y'],['Y','I'],['PH','F'],['F','PH'],['V','B'],['B','V'],['QU','K'],['X','CH']];
    for(let i=0;i<subs.length;i++){
      const pair = subs[(h+i) % subs.length];
      if(up.indexOf(pair[0]) !== -1){
        const s = up.replace(pair[0], pair[1]);
        if(s !== up) return s;
      }
    }
    const sufs = [' & CO', ' PLUS', ' PT', ' STUDIO'];
    return up + sufs[h % sufs.length];
  }

  /* ---------- V5 · quality governor — mede FPS reais e desliga camadas ---------- */
  const Q = { tier: isMobile ? 2 : 3, max: isMobile ? 2 : 3, ema: 60, last: 0, low: 0, hi: 0 };
  function govern(now){
    if(Q.last){
      const dt = now - Q.last;
      if(dt > 0 && dt < 250) Q.ema += (1000/dt - Q.ema) * 0.05;
    }
    Q.last = now;
    if(Q.ema < 48){
      Q.hi = 0;
      if(++Q.low > 90 && Q.tier > 1){ Q.tier--; Q.low = 0; }
    } else {
      if(Q.low > 0) Q.low--;
      /* recuperação simétrica — um hitch no load não degrada a sessão inteira */
      if(Q.ema > 56 && Q.tier < Q.max){ if(++Q.hi > 300){ Q.tier++; Q.hi = 0; } }
      else Q.hi = 0;
    }
  }

  /* ---------- V5 · som da sala de operações (opt-in, 100% sintetizado) ---------- */
  const SND = { on:false, ctx:null, master:null, hum:null, lastPing:0, lastTick:0 };
  const sndBtn = document.getElementById('sndBtn');
  function sndInit(){
    if(SND.ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return false;
    SND.ctx = new AC();
    SND.master = SND.ctx.createGain();
    SND.master.gain.value = 0.11;            /* ~-19dB — presença, nunca invasão */
    SND.master.connect(SND.ctx.destination);
    if(!isMobile){
      const o1 = SND.ctx.createOscillator(), o2 = SND.ctx.createOscillator();
      const f = SND.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 160;
      const g = SND.ctx.createGain(); g.gain.value = 0;
      o1.frequency.value = 55; o2.frequency.value = 55.6;
      o1.connect(f); o2.connect(f); f.connect(g); g.connect(SND.master);
      o1.start(); o2.start();
      SND.hum = g;
    }
    return true;
  }
  function tone(freq, freqTo, dur, type, vol){
    if(!SND.on || !SND.ctx) return;
    const t0 = SND.ctx.currentTime;
    const o = SND.ctx.createOscillator(), g = SND.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if(freqTo) o.frequency.exponentialRampToValueAtTime(freqTo, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(SND.master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function sndPing(){
    const now = performance.now();
    if(now - SND.lastPing < 140) return;
    SND.lastPing = now;
    tone(880, 440, 0.22, 'sine', 0.5);
  }
  function sndTick(){
    const now = performance.now();
    if(now - SND.lastTick < 90) return;
    SND.lastTick = now;
    tone(1700, 0, 0.025, 'square', 0.06);
  }
  function sndAlarm(){
    tone(660, 0, 0.12, 'square', 0.22);
    setTimeout(function(){ tone(880, 0, 0.16, 'square', 0.22); }, 170);
    setTimeout(function(){ tone(55, 0, 0.7, 'sine', 0.5); }, 60);
  }
  function sndChord(){
    tone(392, 0, 1.4, 'sine', 0.3);
    setTimeout(function(){ tone(494, 0, 1.3, 'sine', 0.26); }, 90);
    setTimeout(function(){ tone(587, 0, 1.2, 'sine', 0.24); }, 180);
  }
  function sndSetUI(){
    if(!sndBtn) return;
    sndBtn.setAttribute('aria-pressed', SND.on ? 'true' : 'false');
    sndBtn.querySelector('.eq').textContent = SND.on ? '■' : '▶';
    sndBtn.title = (SND.on ? 'Desligar' : 'Ligar') + ' o som ambiente da sala de operações';
  }
  function sndToggle(){
    if(!sndInit()){ if(sndBtn) sndBtn.remove(); return; }
    SND.on = !SND.on;
    try{ localStorage.setItem('rm-snd', SND.on ? '1' : '0'); }catch(e){}
    if(SND.on){ SND.ctx.resume(); if(SND.hum) SND.hum.gain.setTargetAtTime(0.05, SND.ctx.currentTime, 0.4); sndPing(); }
    else{
      if(SND.hum) SND.hum.gain.setTargetAtTime(0, SND.ctx.currentTime, 0.08);
      /* suspende o contexto — os osciladores do hum não ficam a gastar CPU */
      setTimeout(function(){ if(!SND.on && SND.ctx) SND.ctx.suspend(); }, 250);
    }
    sndSetUI();
  }
  if(sndBtn){
    if(!(window.AudioContext || window.webkitAudioContext) || reduce){ sndBtn.remove(); }
    else{
      sndBtn.addEventListener('click', sndToggle);
      let pref = null;
      try{ pref = localStorage.getItem('rm-snd'); }catch(e){}
      if(pref === '1'){
        /* escolheu som na última visita: rearma no primeiro gesto (autoplay policy).
           Se o gesto for no próprio botão, deixa o click tratar — evita double-toggle. */
        const arm = function(e){
          if(SND.on) return;
          if(e && e.target && e.target.closest && e.target.closest('#sndBtn')) return;
          sndToggle();
        };
        window.addEventListener('pointerdown', arm, {once:true});
      }
    }
  }
  document.addEventListener('visibilitychange', function(){
    if(!SND.ctx) return;
    if(document.hidden) SND.ctx.suspend();
    else if(SND.on) SND.ctx.resume();
  });

  let W=0, H=0, dpr=1;
  function resize(){
    dpr = Math.min(window.devicePixelRatio||1, isMobile?1.5:2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W*dpr; canvas.height = H*dpr;
    canvas.style.width = W+'px'; canvas.style.height = H+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  resize(); window.addEventListener('resize', resize);

  /* ---------- definição das cenas (parâmetros-alvo do radar) ---------- */
  // x,y em fração do viewport · r em fração de min(W,H) · alpha global
  // flags: label (a sua marca), red (alerta ignorado), green (lock final),
  // reticle (mira S3), beam (feixe horizontal S5), rings (nº de anéis)
  const SCENES = {
    hero:      {x:.5,  y:.45, r:.62, alpha:1.00, sweep:0.008, label:1, red:0, green:0, reticle:0, beam:0, named:0},
    tese:      {x:.5,  y:.5,  r:.85, alpha:0.34, sweep:0.004, label:0, red:1, green:0, reticle:0, beam:0, named:0},
    vigilancia:{x:.5,  y:.5,  r:.44, alpha:1.00, sweep:0.018, label:0, red:0, green:0, reticle:0, beam:0, named:1, anchor:'#radarStage'},
    registo:   {x:.72, y:.5,  r:.40, alpha:0.40, sweep:0.008, label:0, red:0, green:0, reticle:0, beam:0, named:0, anchor:'#priceboxRegisto'},
    funil:     {x:.5,  y:.30, r:.34, alpha:0.50, sweep:0.012, label:0, red:0, green:0, reticle:0, beam:1, named:0},
    ambient:   {x:.5,  y:.55, r:1.05, alpha:0.10, sweep:0.003, label:0, red:0, green:0, reticle:0, beam:0, named:0},
    final:     {x:.5,  y:.38, r:.5,  alpha:0.85, sweep:0.010, label:1, red:0, green:1, reticle:0, beam:0, named:0}
  };
  const cur = Object.assign({}, SCENES.hero);   // estado interpolado
  let activeScene = 'hero';

  /* qual a secção dominante no viewport */
  const sections = Array.from(document.querySelectorAll('[data-scene]'));
  function dominantScene(){
    const mid = H*0.5;
    let best=null, bestDist=Infinity;
    for(const s of sections){
      const rc = s.getBoundingClientRect();
      if(rc.bottom < 0 || rc.top > H) continue;
      const center = rc.top + rc.height/2;
      const d = Math.abs(center - mid);
      // secções altas: se o meio do viewport está dentro, ganha já
      if(rc.top <= mid && rc.bottom >= mid){ best = s; break; }
      if(d < bestDist){ bestDist = d; best = s; }
    }
    return best;
  }

  /* alvo resolvido (anchors seguem elementos reais no viewport) */
  function resolveTarget(){
    const sec = dominantScene();
    if(sec){
      activeScene = sec.dataset.scene;
      const hudScene = document.getElementById('hud-scene');
      if(hudScene && sec.dataset.hud) hudScene.textContent = sec.dataset.hud;
      document.body.classList.toggle('scene-final', activeScene==='final');
    }
    const t = Object.assign({}, SCENES[activeScene] || SCENES.ambient);
    if(t.anchor){
      const el = document.querySelector(t.anchor);
      if(el){
        const rc = el.getBoundingClientRect();
        if(rc.bottom > -200 && rc.top < H+200){
          t.x = (rc.left + rc.width/2) / W;
          t.y = (rc.top + rc.height/2) / H;
          t.r = (Math.min(rc.width, rc.height)/2.15) / Math.min(W,H);
        }
        if(t.anchor==='#radarStage') stageRect={x:rc.left, y:rc.top, w:rc.width, h:rc.height};
      }
    }
    return t;
  }

  /* blips: posições polares fixas; índices com papéis especiais */
  const blips=[];
  const NB = isMobile ? 6 : 9;
  for(let i=0;i<NB;i++){
    blips.push({ a:(i/NB)*Math.PI*2 + 0.35, r:0.28+(i%4)*0.18, hot:i===2, threat:i===5 });
  }

  /* marcas nomeadas — vivem dentro do radar na cena de vigilância,
     sincronizadas com as linhas da lista de deteções (#scopeList) */
  const MARKS=[
    {name:'NORTE FILMES, Lda', st:'clear',    a:-2.30, r:.58},
    {name:'VINHO & PEDRA',     st:'conflict', a:-0.62, r:.55, pct:'87%'},
    {name:'Oliveira & Co',     st:'clear',    a: 2.52, r:.62},
    {name:'Estúdio Rebento',   st:'scan',     a: 0.95, r:.42}
  ];
  const markRowEls=document.querySelectorAll('#scopeList .scope-row:not(.user)');
  MARKS.forEach((m,i)=>{ m.row=markRowEls[i]||null; m._rv=0; });
  const NAMED = isMobile ? MARKS.filter((m,i)=>i!==2) : MARKS;

  /* ---------- V5 · a marca do visitante entra no radar ---------- */
  const UMARK = { name:'', st:'user', a:-1.42, r:.66, _rv:0, row:document.getElementById('userRow') };
  const userRowName = document.getElementById('userRowName');
  const sosiaLineEl = document.getElementById('sosiaLine');
  let sosiaTimer = null;
  function renderSosiaLine(){
    if(!sosiaLineEl) return;
    if(RM.sosia){
      sosiaLineEl.innerHTML = '';
      const b = document.createElement('b');
      b.textContent = '«' + RM.sosia + '»';
      sosiaLineEl.append('E se amanhã aparecesse ', b, ' no Boletim? Semelhança alta — e ninguém o avisava. ');
      const s = document.createElement('span'); s.className = 'sim'; s.textContent = '· simulação ilustrativa';
      sosiaLineEl.append(s);
      sosiaLineEl.classList.add('on');
    } else {
      sosiaLineEl.classList.remove('on');
      sosiaLineEl.textContent = '';
    }
  }
  function setBrand(raw){
    /* slice por code points — não parte emoji/surrogates na fronteira */
    const clean = Array.from((raw||'').replace(/\s+/g,' ').trim()).slice(0,24).join('');
    if(clean === RM.brand) return;
    RM.brand = clean;
    RM.sosia = Array.from(clean).length >= 3 ? makeSosia(clean) : '';
    RM.pulse = clean ? 34 : 0;           /* o blip dourado reage à escrita */
    UMARK.name = clean.toUpperCase();
    UMARK._rv = reduce ? 1 : 0;          /* redescoberto letra a letra pelo feixe */
    if(UMARK.row){
      UMARK.row.classList.toggle('on', !!clean);
      if(userRowName) userRowName.textContent = clean;
    }
    /* debounce do live region — sem spam de screen reader a cada tecla */
    clearTimeout(sosiaTimer);
    if(RM.sosia) sosiaTimer = setTimeout(renderSosiaLine, 650);
    else renderSosiaLine();
    try{ sessionStorage.setItem('rm-brand', clean); }catch(e){}
    if(SND.on) sndTick();
    if(reduce) requestAnimationFrame(draw);   /* re-renderiza o frame estático com o nome */
  }
  /* sincronização bidirecional hero ↔ formulário final */
  const brandInput = document.getElementById('brandInput');
  const formBrand = document.getElementById('f-brand');
  if(brandInput){
    brandInput.addEventListener('input', function(){
      setBrand(brandInput.value);
      if(formBrand && formBrand.value !== brandInput.value) formBrand.value = brandInput.value;
    });
  }
  if(formBrand){
    formBrand.addEventListener('input', function(){
      setBrand(formBrand.value);
      if(brandInput && brandInput.value !== formBrand.value) brandInput.value = formBrand.value;
    });
  }
  try{
    const saved = sessionStorage.getItem('rm-brand');
    if(saved){ if(brandInput) brandInput.value = saved; if(formBrand) formBrand.value = saved; setBrand(saved); }
  }catch(e){}

  /* ---------- o drama da deteção: o feixe trava no conflito ---------- */
  const stageEl=document.getElementById('radarStage');
  const stageAlertEl=document.getElementById('stageAlert');
  const stageScanEl=document.getElementById('stageScanning');
  const drama={state:'idle', t:0, prog:0, cool:200};
  let stageRect=null;
  function startAlert(){
    if(stageEl) stageEl.classList.add('alert');
    if(stageAlertEl) stageAlertEl.classList.add('on');
    if(stageScanEl){ stageScanEl.textContent='⚠ CONFLITO DETETADO · CL. 33'; stageScanEl.classList.add('alert'); }
    if(MARKS[1].row) MARKS[1].row.classList.add('alarm');
    if(SND.on) sndAlarm();
  }
  function endAlert(){
    if(stageEl) stageEl.classList.remove('alert');
    if(stageAlertEl) stageAlertEl.classList.remove('on');
    if(stageScanEl){ stageScanEl.textContent='● BPI · varrimento semanal'; stageScanEl.classList.remove('alert'); }
    if(MARKS[1].row) MARKS[1].row.classList.remove('alarm');
  }
  function updateDrama(){
    const active = activeScene==='vigilancia' && cur.named>0.6;
    if(!active){
      if(drama.state!=='idle'){ endAlert(); drama.state='idle'; drama.prog=0; drama.cool=200; }
      return 1;
    }
    if(drama.state==='idle'){
      if(drama.cool>0){ drama.cool--; return 1; }
      const conf=NAMED.find(m=>m.st==='conflict');
      if(!conf) return 1;
      const ca=((conf.a%TAU)+TAU)%TAU, sa=((sweep%TAU)+TAU)%TAU;
      let diff=Math.abs(sa-ca); if(diff>Math.PI) diff=TAU-diff;
      if(diff<0.06){ drama.state='lock'; drama.t=0; startAlert(); }
      return 1;
    }
    if(drama.state==='lock'){
      drama.t++;
      drama.prog=Math.min(1, drama.t/50);
      if(drama.t>230){ drama.state='release'; drama.t=0; endAlert(); }
      return 0.12+(1-drama.prog)*0.88;   /* o tempo abranda */
    }
    /* release — o feixe retoma a velocidade */
    drama.t++; drama.prog=Math.max(0, 1-drama.t/40);
    if(drama.t>40){ drama.state='idle'; drama.cool=560; drama.prog=0; }
    return 1;
  }

  /* faíscas no rasto do feixe */
  const sparks=[];

  /* crosshair interativo sobre o palco (desktop) */
  let cx=-1, cy=-1;
  if(stageEl && !isMobile){
    stageEl.addEventListener('pointermove',(e)=>{cx=e.clientX; cy=e.clientY;},{passive:true});
    stageEl.addEventListener('pointerleave',()=>{cx=-1;},{passive:true});
  }
  /* poeira de fundo — vida ambiente */
  const dust=[];
  if(!isMobile && !reduce){
    for(let i=0;i<42;i++) dust.push({x:Math.random(), y:Math.random(), s:Math.random()*1.3+.4, v:(Math.random()*.00012+.00004)});
  }

  /* parallax do cursor (apenas hero) */
  let mx=0,my=0;
  if(!reduce){
    window.addEventListener('pointermove',(e)=>{
      mx=(e.clientX/W-.5)*16; my=(e.clientY/H-.5)*16;
    },{passive:true});
  }

  let sweep=0, frame=0;
  const TAU = Math.PI*2;

  function lerp(a,b,k){ return a+(b-a)*k; }

  /* V5 · brilho especular (latão gravado) — sprite pré-renderizado, zero alocação por frame */
  let sheenC=null, shX=0, shY=0, tilt=0;
  function sheenSprite(){
    sheenC=document.createElement('canvas'); sheenC.width=sheenC.height=256;
    const c=sheenC.getContext('2d');
    const g=c.createRadialGradient(128,128,0,128,128,128);
    g.addColorStop(0,'rgba(224,170,74,0.5)');
    g.addColorStop(0.5,'rgba(224,170,74,0.1)');
    g.addColorStop(1,'rgba(224,170,74,0)');
    c.fillStyle=g; c.fillRect(0,0,256,256);
  }

  function draw(){
    frame++;
    govern(performance.now());
    const t = reduce ? cur : resolveTarget();
    const K = reduce ? 1 : 0.07;

    /* V5 · Ato II — o mini-filme da tese comanda o radar */
    const f2 = (activeScene==='tese' && !reduce) ? RM.act2.p : 0;
    let filmMult=1, filmThreatR=null, filmRedBoost=0;
    if(f2>0.001 && f2<0.999){
      const appr=Math.min(1, Math.max(0,(f2-0.06)/0.34));
      filmThreatR=1.45-appr*0.9;                 /* o pedido colidente aproxima-se vindo de fora */
      if(f2>0.42 && f2<0.80){ filmMult=0.04; filmRedBoost=(f2-0.42)/0.38; }  /* o radar emudece */
      else if(f2>=0.80){ filmMult=2.2; }         /* smash-cut: o feixe reacende */
    }
    cur.x=lerp(cur.x,t.x,K); cur.y=lerp(cur.y,t.y,K); cur.r=lerp(cur.r,t.r,K);
    cur.alpha=lerp(cur.alpha,t.alpha,K); cur.sweep=lerp(cur.sweep,t.sweep,K);
    cur.label=lerp(cur.label,t.label,K); cur.red=lerp(cur.red,t.red,K);
    cur.green=lerp(cur.green,t.green,K); cur.reticle=lerp(cur.reticle,t.reticle,K);
    cur.beam=lerp(cur.beam,t.beam,K); cur.named=lerp(cur.named,t.named||0,K);

    ctx.clearRect(0,0,W,H);

    /* poeira ambiente */
    if(Q.tier>=3) for(const d of dust){
      d.y -= d.v; if(d.y<0) d.y=1;
      ctx.globalAlpha = .12;
      ctx.fillStyle = '#C8973A';
      ctx.fillRect(d.x*W, d.y*H, d.s, d.s);
    }
    ctx.globalAlpha = 1;

    const parallaxOn = activeScene==='hero' ? 1 : 0;
    let ox = cur.x*W + mx*parallaxOn;
    let oy = cur.y*H + my*parallaxOn;
    /* impacto: tremor curto quando o lock dispara */
    if(drama.state==='lock' && drama.t<22){
      const k=(22-drama.t)/22*5;
      ox+=(Math.random()-.5)*k; oy+=(Math.random()-.5)*k;
    }
    /* V5 · degauss — wobble decadente de CRT nos primeiros instantes */
    if(!reduce && frame<80){
      const dk=(80-frame)/80;
      ox+=Math.sin(frame*0.55)*dk*4.5; oy+=Math.cos(frame*0.43)*dk*2.5;
    }
    /* V5 · fonte do specular/parallaxe: cursor no desktop, deriva de scroll no mobile */
    if(!reduce){
      const sxT=isMobile?Math.sin(window.scrollY*0.0012):mx/8;
      const syT=isMobile?Math.cos(window.scrollY*0.0009):my/8;
      shX+=(sxT-shX)*0.04; shY+=(syT-shY)*0.04;
    }
    const R  = cur.r*Math.min(W,H);
    const A  = cur.alpha;

    /* V5 · plano de grua — entre cenas, a página atravessa o plano do radar */
    if(!reduce){
      const anchored=activeScene==='vigilancia'||activeScene==='registo';
      const transit=Math.abs(cur.r-t.r)+Math.abs(cur.y-t.y)+Math.abs(cur.x-t.x);
      const tTarget=(!isMobile && Q.tier>=3 && !anchored && transit>0.03 && f2===0)?Math.min(13,transit*46):0;
      tilt+=(tTarget-tilt)*0.06;
      if(tilt>0.25) canvas.style.transform='perspective(1100px) rotateX('+tilt.toFixed(2)+'deg)';
      else if(canvas.style.transform) canvas.style.transform='';
    }
    if(A < 0.01){ if(!reduce) requestAnimationFrame(draw); return; }

    /* anéis concêntricos — respiram suavemente na cena de vigilância */
    ctx.lineWidth=1;
    for(let i=1;i<=5;i++){
      const br=1+cur.named*0.012*Math.sin(frame*0.04+i*1.7);
      ctx.beginPath(); ctx.arc(ox,oy,R*i/5*br,0,TAU);
      ctx.strokeStyle='rgba(200,151,58,'+((0.11-i*0.013)*A)+')'; ctx.stroke();
    }
    /* cruz */
    ctx.strokeStyle='rgba(200,151,58,'+(0.07*A)+')';
    ctx.beginPath(); ctx.moveTo(ox-R,oy); ctx.lineTo(ox+R,oy);
    ctx.moveTo(ox,oy-R); ctx.lineTo(ox,oy+R); ctx.stroke();

    /* marcas de graus no anel exterior — contra-rotação lenta em vigilância */
    ctx.strokeStyle='rgba(200,151,58,'+(0.20*A)+')';
    for(let g=0; g<36; g++){
      const ga=g/36*TAU - sweep*0.07*cur.named;
      const r1=R*0.985, r2= g%9===0 ? R*0.94 : R*0.965;
      ctx.beginPath();
      ctx.moveTo(ox+Math.cos(ga)*r1, oy+Math.sin(ga)*r1);
      ctx.lineTo(ox+Math.cos(ga)*r2, oy+Math.sin(ga)*r2);
      ctx.stroke();
    }

    /* V5 · specular sheen — luz a deslizar sobre o latão gravado dos anéis */
    if(!reduce && Q.tier>=2 && cur.named<0.5 && A>0.15){
      if(!sheenC) sheenSprite();
      const sw=R*1.5;
      ctx.save();
      ctx.globalCompositeOperation='overlay';
      ctx.globalAlpha=0.4*A;
      ctx.drawImage(sheenC, ox-shX*R*0.8-sw/2, oy-shY*R*0.8-sw/2, sw, sw);
      ctx.restore();
    }

    /* varredura — com rasto fosforescente e drama do lock */
    if(!reduce) sweep += cur.sweep * updateDrama() * filmMult;
    ctx.save(); ctx.translate(ox,oy); ctx.rotate(sweep);
    if(ctx.createConicGradient){
      /* rasto de fósforo: brilha atrás da agulha e decai */
      const trail=0.22+cur.named*0.16;
      const cg=ctx.createConicGradient(0,0,0);
      cg.addColorStop(0,'rgba(200,151,58,'+(trail*1.4*A)+')');
      cg.addColorStop(0.02,'rgba(200,151,58,0)');
      cg.addColorStop(0.55,'rgba(200,151,58,0)');
      cg.addColorStop(1,'rgba(200,151,58,'+(trail*A)+')');
      ctx.beginPath(); ctx.arc(0,0,R,0,TAU);
      ctx.fillStyle=cg; ctx.fill();
    } else {
      const g=ctx.createLinearGradient(0,0,R,0);
      g.addColorStop(0,'rgba(200,151,58,'+(0.25*A)+')');
      g.addColorStop(1,'rgba(200,151,58,0)');
      ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0,0,R,-0.55,0.02); ctx.closePath();
      ctx.fillStyle=g; ctx.fill();
    }
    /* agulha */
    ctx.strokeStyle='rgba(224,170,74,'+(0.55*A)+')'; ctx.lineWidth=1.4;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(R,0); ctx.stroke();
    ctx.restore();

    /* faíscas no rasto (cena de vigilância) */
    if(!reduce && cur.named>0.3 && Q.tier>=2){
      const scap=Q.tier>=3?70:32;
      if(sparks.length<scap && frame%2===0) sparks.push({a:sweep, r:Math.random()*0.92+0.05, life:1});
    }
    for(let i=sparks.length-1;i>=0;i--){
      const s=sparks[i]; s.life-=0.012; s.r+=0.0012;
      if(s.life<=0){ sparks.splice(i,1); continue; }
      ctx.globalAlpha=s.life*0.45*cur.named*A;
      ctx.fillStyle='#e0aa4a';
      ctx.fillRect(ox+Math.cos(s.a)*R*s.r, oy+Math.sin(s.a)*R*s.r, 1.7, 1.7);
    }
    ctx.globalAlpha=1;

    /* centro */
    ctx.beginPath(); ctx.arc(ox,oy,4,0,TAU);
    ctx.fillStyle='rgba(200,151,58,'+A+')';
    ctx.shadowColor='#C8973A'; ctx.shadowBlur=18*A; ctx.fill(); ctx.shadowBlur=0;

    /* blips */
    const sweepA=((sweep%TAU)+TAU)%TAU;
    const dim=1-cur.named*0.75;   /* os blips genéricos cedem o palco aos nomes */
    for(const b of blips){
      let bx=ox+Math.cos(b.a)*R*b.r+shX*6;
      let by=oy+Math.sin(b.a)*R*b.r+shY*4;
      let ba=((b.a%TAU)+TAU)%TAU;
      let diff=Math.abs(sweepA-ba); if(diff>Math.PI) diff=TAU-diff;
      const lit=Math.max(0,1-diff*1.6);
      if(SND.on && (b.hot||b.threat) && lit>0.92 && !b._pg){ b._pg=true; sndPing(); }
      if(diff>1) b._pg=false;

      if(b.threat && cur.red>0.05){
        /* o pedido colidente — vermelho, com ondas a expandir (ninguém avisa).
           Com marca digitada, é o sósia DELA que se aproxima (Ato II). */
        if(filmThreatR!==null){
          bx=ox+Math.cos(b.a)*R*filmThreatR;
          by=oy+Math.sin(b.a)*R*filmThreatR;
        }
        const ra=Math.min(1,cur.red*(1+filmRedBoost*0.5))*A;
        const pw=140-Math.round(filmRedBoost*70);
        const pulse=(frame%pw)/pw;
        ctx.beginPath(); ctx.arc(bx,by,3.2+filmRedBoost*1.6,0,TAU);
        ctx.fillStyle='rgba(229,96,74,'+(0.85*ra)+')';
        ctx.shadowColor='#e5604a'; ctx.shadowBlur=(16+filmRedBoost*14)*ra; ctx.fill(); ctx.shadowBlur=0;
        ctx.beginPath(); ctx.arc(bx,by,4+pulse*(26+filmRedBoost*18),0,TAU);
        ctx.strokeStyle='rgba(229,96,74,'+((1-pulse)*0.7*ra)+')'; ctx.lineWidth=1.2; ctx.stroke();
        if(cur.red>0.5 && activeScene==='tese'){
          ctx.font='10px JetBrains Mono, monospace';
          ctx.fillStyle='rgba(255,138,114,'+(0.8*ra)+')';
          ctx.fillText(RM.sosia ? RM.sosia+' (simulação)' : 'pedido colidente', bx+12, by+3);
        }
        continue;
      }

      const hot=b.hot;
      const base=hot?0.5:0.24;
      const alpha=(base+lit*0.6)*A*dim;
      const size=(hot?3.4:1.9)+lit*2.0;
      let fill;
      if(hot && cur.green>0.5) fill='rgba(93,214,160,'+alpha+')';
      else if(hot) fill='rgba(224,170,74,'+alpha+')';
      else fill='rgba(200,151,58,'+alpha+')';
      ctx.beginPath(); ctx.arc(bx,by,size,0,TAU);
      ctx.fillStyle=fill;
      if(lit>0.3){ctx.shadowColor=hot&&cur.green>0.5?'#5dd6a0':'#e0aa4a'; ctx.shadowBlur=14*lit*A;}
      ctx.fill(); ctx.shadowBlur=0;

      if(hot){
        const ringCol = cur.green>0.5 ? '93,214,160' : '224,170,74';
        ctx.beginPath(); ctx.arc(bx,by,size+8+lit*8,0,TAU);
        ctx.strokeStyle='rgba('+ringCol+','+((0.35+0.3*lit)*A)+')'; ctx.lineWidth=1.2; ctx.stroke();
        if(cur.green>0.5){
          /* lock verde: segundo anel fixo + ticks */
          ctx.beginPath(); ctx.arc(bx,by,size+18,0,TAU);
          ctx.strokeStyle='rgba(93,214,160,'+(0.5*A)+')'; ctx.stroke();
        }
        /* V5 · o blip dourado responde à escrita do visitante */
        if(RM.pulse>0){
          RM.pulse--;
          const pp=RM.pulse/34;
          ctx.beginPath(); ctx.arc(bx,by,size+10+(1-pp)*26,0,TAU);
          ctx.strokeStyle='rgba(224,170,74,'+(pp*0.7*A)+')'; ctx.lineWidth=1.4; ctx.stroke();
        }
        /* V5 · cerimónia de fecho — mira verde + anéis após o pedido enviado */
        if(RM.ceremony.on && cur.green>0.3){
          const c2=RM.ceremony; c2.t++;
          const pe=Math.min(1,c2.t/45), eo=1-Math.pow(1-pe,3);
          const dist=14+(1-eo)*70, Lb=10;
          ctx.strokeStyle='rgba(93,214,160,'+(0.95*eo*A)+')'; ctx.lineWidth=1.8;
          [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(function(cn){
            ctx.beginPath();
            ctx.moveTo(bx+cn[0]*dist-cn[0]*Lb, by+cn[1]*dist);
            ctx.lineTo(bx+cn[0]*dist, by+cn[1]*dist);
            ctx.lineTo(bx+cn[0]*dist, by+cn[1]*dist-cn[1]*Lb);
            ctx.stroke();
          });
          const rp=(c2.t%70)/70;
          ctx.beginPath(); ctx.arc(bx,by,dist+rp*46,0,TAU);
          ctx.strokeStyle='rgba(93,214,160,'+((1-rp)*0.5*A)+')'; ctx.lineWidth=1.2; ctx.stroke();
          if(c2.t>340){ c2.on=false; c2.done=true; }
        }
        if(cur.label>0.4){
          ctx.font='10px JetBrains Mono, monospace';
          ctx.fillStyle='rgba(244,238,222,'+((0.45+0.4*lit)*cur.label*A)+')';
          let lbl;
          if((RM.ceremony.on || RM.ceremony.done) && cur.green>0.3) lbl=(RM.brand?'«'+RM.brand+'»':'a sua marca')+' · PEDIDO RECEBIDO';
          else if(RM.brand) lbl='«'+RM.brand+'»'+(cur.green>0.5?' · no radar · simulação':' · a sua marca');
          else lbl=cur.green>0.5?'a sua marca · pronta a proteger':'a sua marca';
          ctx.fillText(lbl, bx+size+12, by+3);
        }
      }
    }

    /* nomes dentro do radar — cena de vigilância (+ a marca do visitante) */
    if(cur.named>0.04){
      const na=cur.named*A;
      const fName=isMobile?'10px':'12px', fSub=isMobile?'8px':'9px';
      ctx.textBaseline='middle';
      const NLIST = RM.brand ? NAMED.concat([UMARK]) : NAMED;
      for(const m of NLIST){
        const bx=ox+Math.cos(m.a)*R*m.r+shX*6;
        const by=oy+Math.sin(m.a)*R*m.r+shY*4;
        let ma=((m.a%TAU)+TAU)%TAU;
        let diff=Math.abs(sweepA-ma); if(diff>Math.PI) diff=TAU-diff;
        const lit=Math.max(0,1-diff*1.3);
        if(SND.on && lit>0.92 && !m._pg){ m._pg=true; sndPing(); }
        if(diff>1) m._pg=false;
        const right=Math.cos(m.a)>=0;
        ctx.textAlign=right?'left':'right';
        let lx=bx+(right?15:-15);
        /* manter a etiqueta dentro do palco do radar */
        const line1=(m.st==='conflict')?(m.name+' · '+m.pct):m.name;
        ctx.font=(m.st==='conflict'?'600 ':'')+fName+' JetBrains Mono, monospace';
        const lw=ctx.measureText(line1).width;
        if(right){ lx=Math.min(lx, ox+R*1.04-lw); }
        else{ lx=Math.max(lx, ox-R*1.04+lw); }

        /* o feixe "descobre" cada nome: typewriter à primeira passagem */
        if(reduce) m._rv=1;
        if(m.st==='conflict' && drama.prog>0) m._rv=1;
        if(lit>0.5 && m._rv<1){ m._rv=Math.min(1, m._rv+0.055); if(SND.on) sndTick(); }
        const txt1=m._rv>=1 ? line1 : (m._rv>0 ? line1.slice(0,Math.ceil(line1.length*m._rv))+'▌' : '');

        /* linha de dados centro → blip enquanto o feixe o lê */
        if(lit>0.5 && m._rv>0){
          ctx.setLineDash([3,6]);
          ctx.strokeStyle='rgba(224,170,74,'+((lit-0.5)*0.55*na)+')'; ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(ox,oy); ctx.lineTo(bx,by); ctx.stroke();
          ctx.setLineDash([]);
        }

        if(m.st==='conflict'){
          /* o pedido colidente — vermelho, pulso e onda de alerta */
          const pulse=(frame%120)/120;
          ctx.beginPath(); ctx.arc(bx,by,4.4,0,TAU);
          ctx.fillStyle='rgba(229,96,74,'+(0.95*na)+')';
          ctx.shadowColor='#e5604a'; ctx.shadowBlur=22*na; ctx.fill(); ctx.shadowBlur=0;
          ctx.beginPath(); ctx.arc(bx,by,6+pulse*32,0,TAU);
          ctx.strokeStyle='rgba(229,96,74,'+((1-pulse)*0.75*na)+')'; ctx.lineWidth=1.3; ctx.stroke();
          ctx.font='600 '+fName+' JetBrains Mono, monospace';
          ctx.fillStyle='rgba(255,138,114,'+((0.7+0.3*lit)*na)+')';
          if(txt1) ctx.fillText(txt1, lx, by-6);
          if(m._rv>=1){
            ctx.font=fSub+' JetBrains Mono, monospace';
            ctx.fillStyle='rgba(255,138,114,'+(0.6*na)+')';
            ctx.fillText('CONFLITO DETETADO', lx, by+9);
          }
          /* lock: a mira fecha-se sobre o conflito e o palco pisca */
          if(drama.prog>0.01){
            const pe=1-Math.pow(1-drama.prog,3);
            const dist=12+(1-pe)*64, Lb=9;
            ctx.strokeStyle='rgba(229,96,74,'+(0.95*pe*na)+')'; ctx.lineWidth=1.7;
            [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(function(c){
              ctx.beginPath();
              ctx.moveTo(bx+c[0]*dist-c[0]*Lb, by+c[1]*dist);
              ctx.lineTo(bx+c[0]*dist, by+c[1]*dist);
              ctx.lineTo(bx+c[0]*dist, by+c[1]*dist-c[1]*Lb);
              ctx.stroke();
            });
            ctx.beginPath(); ctx.arc(bx,by,dist*1.5,0,TAU);
            ctx.strokeStyle='rgba(229,96,74,'+(0.3*pe*na)+')'; ctx.lineWidth=1; ctx.stroke();
            if(drama.state==='lock' && drama.t<16 && stageRect){
              ctx.fillStyle='rgba(229,96,74,'+((16-drama.t)/16*0.10)+')';
              ctx.fillRect(stageRect.x, stageRect.y, stageRect.w, stageRect.h);
            }
          }
        } else if(m.st==='user'){
          /* V5 · a marca do visitante — dourada, com anel próprio */
          ctx.beginPath(); ctx.arc(bx,by,4.2,0,TAU);
          ctx.fillStyle='rgba(224,170,74,'+((0.6+0.4*lit)*na)+')';
          ctx.shadowColor='#e0aa4a'; ctx.shadowBlur=(14+8*lit)*na; ctx.fill(); ctx.shadowBlur=0;
          ctx.beginPath(); ctx.arc(bx,by,9+lit*5,0,TAU);
          ctx.strokeStyle='rgba(224,170,74,'+((0.4+0.3*lit)*na)+')'; ctx.lineWidth=1.2; ctx.stroke();
          ctx.font='600 '+fName+' JetBrains Mono, monospace';
          ctx.fillStyle='rgba(244,238,222,'+((0.5+0.5*lit)*na)+')';
          if(txt1) ctx.fillText(txt1, lx, by-6);
          if(m._rv>=1){
            ctx.font=fSub+' JetBrains Mono, monospace';
            ctx.fillStyle='rgba(224,170,74,'+((0.45+0.4*lit)*na)+')';
            ctx.fillText('A SUA MARCA · SIMULAÇÃO', lx, by+9);
          }
        } else if(m.st==='scan'){
          /* em análise — dourado, a piscar */
          const tw=(frame%90)<55;
          ctx.beginPath(); ctx.arc(bx,by,3.2,0,TAU);
          ctx.fillStyle='rgba(224,170,74,'+((tw?0.9:0.4)*na)+')';
          ctx.shadowColor='#e0aa4a'; ctx.shadowBlur=12*na; ctx.fill(); ctx.shadowBlur=0;
          ctx.font=fName+' JetBrains Mono, monospace';
          ctx.fillStyle='rgba(244,238,222,'+((0.4+0.5*lit)*na)+')';
          if(txt1) ctx.fillText(txt1, lx, by-6);
          if(m._rv>=1){
            ctx.font=fSub+' JetBrains Mono, monospace';
            ctx.fillStyle='rgba(224,170,74,'+((tw?0.7:0.35)*na)+')';
            ctx.fillText('A ANALISAR…', lx, by+9);
          }
        } else {
          /* sem conflito — verde, acende à passagem do feixe */
          ctx.beginPath(); ctx.arc(bx,by,3.2,0,TAU);
          ctx.fillStyle='rgba(93,214,160,'+((0.4+0.55*lit)*na)+')';
          if(lit>0.3){ctx.shadowColor='#5dd6a0'; ctx.shadowBlur=12*lit*na;}
          ctx.fill(); ctx.shadowBlur=0;
          ctx.font=fName+' JetBrains Mono, monospace';
          ctx.fillStyle='rgba(244,238,222,'+((0.35+0.55*lit)*na)+')';
          if(txt1) ctx.fillText(txt1, lx, by-6);
          if(m._rv>=1){
            ctx.font=fSub+' JetBrains Mono, monospace';
            ctx.fillStyle='rgba(93,214,160,'+((0.3+0.5*lit)*na)+')';
            ctx.fillText('SEM CONFLITO', lx, by+9);
          }
        }
        /* a linha correspondente da lista acende em sincronia com o feixe */
        if(m.row) m.row.classList.toggle('lit', cur.named>0.5 && lit>0.55);
      }

      /* crosshair interativo — o visitante "opera" o radar */
      if(cx>=0 && stageRect && cur.named>0.5){
        const sr=stageRect;
        if(cx>sr.x+8 && cx<sr.x+sr.w-8 && cy>sr.y+46 && cy<sr.y+sr.h-10){
          ctx.strokeStyle='rgba(224,170,74,'+(0.16*na)+')'; ctx.lineWidth=1;
          ctx.beginPath();
          ctx.moveTo(sr.x+10,cy); ctx.lineTo(sr.x+sr.w-10,cy);
          ctx.moveTo(cx,sr.y+48); ctx.lineTo(cx,sr.y+sr.h-10);
          ctx.stroke();
          const dx2=cx-ox, dy2=cy-oy;
          const az=Math.round((Math.atan2(dy2,dx2)*180/Math.PI+360)%360);
          const rr2=Math.sqrt(dx2*dx2+dy2*dy2)/Math.max(R,1);
          ctx.font='9px JetBrains Mono, monospace'; ctx.textAlign='left';
          ctx.fillStyle='rgba(224,170,74,'+(0.55*na)+')';
          ctx.fillText('AZ '+az+'° · R '+rr2.toFixed(2), cx+10, cy-9);
        }
      }
      ctx.textAlign='left'; ctx.textBaseline='alphabetic';
    }

    /* reticle — mira de target lock (S3) */
    if(cur.reticle>0.03){
      const ra=cur.reticle*A;
      const rr=R*1.06;
      const rot=sweep*0.25;
      ctx.save(); ctx.translate(ox,oy); ctx.rotate(rot);
      ctx.strokeStyle='rgba(224,170,74,'+(0.75*ra)+')'; ctx.lineWidth=1.6;
      for(let q=0;q<4;q++){
        ctx.beginPath(); ctx.arc(0,0,rr, q*Math.PI/2+0.18, q*Math.PI/2+Math.PI/2-0.18); ctx.stroke();
      }
      ctx.restore();
      /* cantos fixos */
      ctx.strokeStyle='rgba(224,170,74,'+(0.85*ra)+')'; ctx.lineWidth=2;
      const c=rr*0.78, L=14;
      [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([sx,sy])=>{
        ctx.beginPath();
        ctx.moveTo(ox+sx*c+(-sx*L), oy+sy*c); ctx.lineTo(ox+sx*c, oy+sy*c); ctx.lineTo(ox+sx*c, oy+sy*c+(-sy*L));
        ctx.stroke();
      });
    }

    /* feixe → timeline (S5): linha que sai do radar para o ecrã */
    if(cur.beam>0.03){
      const ba=cur.beam*A;
      const bw=W*0.42*cur.beam;
      const gg=ctx.createLinearGradient(ox,0,ox+bw,0);
      gg.addColorStop(0,'rgba(224,170,74,'+(0.8*ba)+')');
      gg.addColorStop(1,'rgba(224,170,74,0)');
      ctx.strokeStyle=gg; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(ox,oy); ctx.lineTo(ox+bw,oy); ctx.stroke();
      const gg2=ctx.createLinearGradient(ox,0,ox-bw,0);
      gg2.addColorStop(0,'rgba(224,170,74,'+(0.8*ba)+')');
      gg2.addColorStop(1,'rgba(224,170,74,0)');
      ctx.strokeStyle=gg2;
      ctx.beginPath(); ctx.moveTo(ox,oy); ctx.lineTo(ox-bw,oy); ctx.stroke();
    }

    /* V5 · choque de aberração cromática — o lock tem impacto físico */
    if(!reduce && Q.tier>=3 && drama.state==='lock' && drama.t<24){
      const k=(24-drama.t)/24;
      ctx.save();
      ctx.setTransform(1,0,0,1,0,0);
      ctx.globalCompositeOperation='screen';
      ctx.globalAlpha=0.16*k;
      ctx.drawImage(canvas, 5*k*dpr, 0);
      ctx.restore();
    }

    if(!reduce) requestAnimationFrame(draw);
  }

  if(reduce){
    /* movimento reduzido: um único frame estático, discreto atrás do conteúdo */
    sweep = -0.9;
    Object.assign(cur, SCENES.hero, {alpha:0.3});
  }
  requestAnimationFrame(draw);

  /* ---------- progress bar + HUD % + miniNav ---------- */
  const progress=document.getElementById('progress');
  const hudPct=document.getElementById('hud-pct');
  const miniNav=document.getElementById('miniNav');
  const hud=document.getElementById('hud');
  function onScroll(){
    const max=document.documentElement.scrollHeight-H;
    const p=max>0?(window.scrollY/max):0;
    if(progress) progress.style.transform='scaleX('+p+')';
    if(hudPct) hudPct.textContent=String(Math.round(p*100)).padStart(3,'0')+'%';
    const past=window.scrollY > H*0.85;
    if(miniNav) miniNav.classList.toggle('on', past);
    if(hud) hud.classList.toggle('on', past && !reduce);
  }
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();

  /* V5 · ponte para o script DOM (formulário → cerimónia sonora) */
  RM.chord = function(){ if(SND.on) sndChord(); };
})();

/* =====================================================================
   ANIMAÇÕES DOM — GSAP quando disponível; fallback elegante sem ele.
   ===================================================================== */
window.addEventListener('DOMContentLoaded', function(){
  const reduce = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

  function showAll(){
    document.querySelectorAll('.reveal').forEach(e=>e.classList.add('visible'));
    document.querySelectorAll('.steps .step').forEach(e=>e.classList.add('on'));
    const line=document.getElementById('timelineLine');
    if(line) line.style.transform='none';
    const em=document.getElementById('heroEm'); if(em) em.classList.add('drawn');
  }

  /* contadores de preço (count-up) */
  function fmtEUR(v){ return '€'+v.toFixed(2).replace('.',','); }
  function animateCounters(){
    document.querySelectorAll('.counter').forEach(el=>{
      const to=parseFloat(el.dataset.to);
      const obj={v:0};
      gsap.to(obj,{v:to, duration:1.6, ease:'power2.out',
        scrollTrigger:{trigger:el, start:'top 85%', once:true},
        onUpdate:()=>{ el.textContent=fmtEUR(obj.v); },
        onComplete:()=>{ el.textContent=fmtEUR(to); }
      });
    });
  }

  /* duplicar o ticker para loop contínuo sem salto */
  const belt=document.getElementById('tickerBelt');
  if(belt) belt.innerHTML += belt.innerHTML;

  if(reduce || !hasGsap){
    showAll();
    const em=document.getElementById('heroEm'); if(em) em.classList.add('drawn');
  } else {
    document.body.classList.add('motion');
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ignoreMobileResize:true});

    /* ===== V5 · ATO II — a tese vira mini-filme (o desastre em silêncio) =====
       Desktop: pinned + scrub (o scroll é o projetor; voltar atrás re-projeta).
       Mobile: sem pin — o filme corre uma vez quando a secção entra.        */
    (function(){
      const lbT=document.getElementById('lbTop'), lbB=document.getElementById('lbBot');
      const stampEl=document.getElementById('teseStamp');
      const teseWrap=document.querySelector('.tese .wrap');
      const flashEl=document.getElementById('flash');
      const alertEl=document.querySelector('.tese .alertline');
      const STAMPS=['PEDIDO PUBLICADO NO BPI','O TITULAR NÃO FOI NOTIFICADO','O PRAZO LEGAL ESGOTA-SE…','— A MENOS QUE ALGUÉM ESTEJA A VIGIAR'];
      let lastBeat=-2, flashed=false, primed=false;
      /* lite=true (mobile): sem overlays fixed — o filme nunca pinta por cima
         de outras secções em deep-links ou scroll rápido */
      function filmUpdate(p, lite){
        if(window.RM) window.RM.act2.p=p;
        const first=!primed; primed=true;
        if(!lite){
          const inFilm=p>0.02&&p<0.98;
          const lbk=inFilm?Math.min(1, Math.min(p/0.12,(1-p)/0.12)):0;
          if(lbT){ lbT.style.transform='scaleY('+lbk+')'; lbB.style.transform='scaleY('+lbk+')'; }
        }
        if(teseWrap) teseWrap.style.filter=(p>0.15&&p<0.85)?'saturate('+(1-0.6*Math.min(1,(p-0.15)/0.2)).toFixed(3)+')':'';
        /* enquanto o carimbo fala, a alertline estática cede o palco */
        if(alertEl) alertEl.style.opacity=(p>0.16&&p<0.92)?'.18':'';
        let beat=-1;
        if(p>0.18)beat=0; if(p>0.40)beat=1; if(p>0.60)beat=2; if(p>0.80)beat=3;
        if(beat!==lastBeat && stampEl){
          lastBeat=beat;
          if(beat>=0){
            stampEl.textContent=STAMPS[beat];
            stampEl.style.opacity=1;
            stampEl.classList.toggle('gold', beat===3);
            /* flash: 1× por sessão, nunca no primeiro update (load a meio da página) */
            if(beat===3 && !flashed && flashEl && !lite && !first){
              flashed=true;
              flashEl.style.transition='none'; flashEl.style.opacity=.5;
              requestAnimationFrame(function(){ flashEl.style.transition='opacity .55s ease'; flashEl.style.opacity=0; });
            }
          } else { stampEl.style.opacity=0; }
        }
      }
      if(!window.matchMedia('(max-width:760px)').matches){
        ScrollTrigger.create({
          trigger:'.tese', pin:true, scrub:0.5, end:'+=220%', anticipatePin:1,
          onUpdate:function(self){ filmUpdate(self.progress, false); }
        });
      } else {
        ScrollTrigger.create({
          trigger:'.tese', start:'top 60%', once:true,
          onEnter:function(){
            const tese=document.querySelector('.tese');
            const rc=tese?tese.getBoundingClientRect():null;
            /* deep-link/restauro de scroll: a tese já não está visível → salta ao estado final */
            if(!rc || rc.bottom<0 || rc.top>window.innerHeight){ filmUpdate(1, true); return; }
            const o={p:0};
            gsap.to(o,{p:1, duration:7, ease:'none', onUpdate:function(){ filmUpdate(o.p, true); }});
          }
        });
      }
    })();

    /* entrada do hero — kinetic type */
    const words=document.querySelectorAll('#heroTitle .w');
    gsap.from(words,{y:70, opacity:0, rotateX:25, duration:1, ease:'power3.out', stagger:.12, delay:.15});
    const em=document.getElementById('heroEm');
    gsap.from(em,{clipPath:'inset(0 100% 0 0)', duration:1.2, ease:'power3.inOut', delay:.7,
      onComplete:()=>em.classList.add('drawn')});
    gsap.from('.hero .eyebrow',{opacity:0, y:-12, duration:.8, delay:.1});
    gsap.from('#heroLede',{opacity:0, y:24, duration:.9, delay:1.0});
    gsap.from('#heroFork',{opacity:0, y:30, duration:.9, delay:1.25});
    /* parallax suave do conteúdo hero */
    const heroInner=document.getElementById('heroInner');
    window.addEventListener('pointermove',(e)=>{
      const dx=(e.clientX/window.innerWidth-.5), dy=(e.clientY/window.innerHeight-.5);
      gsap.to(heroInner,{x:dx*-10, y:dy*-6, duration:.8, ease:'power2.out'});
    },{passive:true});

    /* reveals genéricos */
    ScrollTrigger.batch('.reveal',{
      start:'top 86%',
      onEnter:batch=>{ batch.forEach((el,i)=>setTimeout(()=>el.classList.add('visible'), i*90)); },
      once:true
    });

    /* contadores */
    animateCounters();

    /* timeline do funil — a linha desenha-se, os nós acendem em sequência */
    const steps=document.querySelectorAll('.steps .step');
    const line=document.getElementById('timelineLine');
    const tl=gsap.timeline({
      scrollTrigger:{trigger:'#timeline', start:'top 75%', end:'bottom 55%', scrub:.6}
    });
    const vertical=window.matchMedia('(max-width:760px)').matches;
    tl.to(line,{[vertical?'scaleY':'scaleX']:1, ease:'none', duration:3});
    steps.forEach((s,i)=>{
      tl.call(()=>s.classList.add('on'), null, 0.6+i*1.1);
    });
    /* garante estado final se saltar a secção */
    ScrollTrigger.create({trigger:'#timeline', start:'bottom 40%',
      onEnter:()=>{ steps.forEach(s=>s.classList.add('on')); gsap.set(line,{scaleX:1, scaleY:1}); }});

    /* CTA magnético */
    document.querySelectorAll('.btn-gold').forEach(btn=>{
      btn.addEventListener('pointermove',(e)=>{
        const r=btn.getBoundingClientRect();
        gsap.to(btn,{x:(e.clientX-r.left-r.width/2)*.18, y:(e.clientY-r.top-r.height/2)*.3, duration:.3});
      });
      btn.addEventListener('pointerleave',()=>gsap.to(btn,{x:0,y:0,duration:.45,ease:'elastic.out(1,.5)'}));
    });
  }

  /* ---------- consola live-ops: contador de análise (a lista é sincronizada
     pelo próprio feixe do radar, no draw loop do canvas) ---------- */
  if(!reduce){
    const statScan=document.getElementById('statScan');
    if(statScan){
      setInterval(()=>{
        const v=815+Math.floor(Math.random()*55);
        statScan.textContent=v+'/s';
      }, 900);
    }
  }

  /* ---------- formulário (Formspree) ---------- */
  const form=document.getElementById('cform');
  if(form){
    const success=document.getElementById('cform-success');
    const alt=document.querySelector('.cform-alt');
    const btn=document.getElementById('cform-submit');
    /* CTAs com data-intent pré-selecionam o interesse (vigilância / orçamento de registo) */
    document.querySelectorAll('a[data-intent]').forEach(a=>{
      a.addEventListener('click', ()=>{
        const v=a.dataset.intent==='registo' ? 'registo — pedir orçamento' : 'vigilância';
        const r=form.querySelector('input[name="interesse"][value="'+v+'"]');
        if(r) r.checked=true;
      });
    });
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const data=Object.fromEntries(new FormData(form).entries());
      if(!data.name||!data.email||!data.marca){ form.reportValidity(); return; }
      const orig=btn.textContent; btn.disabled=true; btn.textContent='A enviar…';
      try{
        const fd=new FormData();
        fd.append('name',data.name);
        fd.append('email',data.email);
        fd.append('_replyto',data.email);
        fd.append('_subject','Pedido Radar Marca — '+data.marca+' · '+(data.interesse||'vigilância'));
        fd.append('telefone',data.telefone||'');
        fd.append('marca',data.marca);
        fd.append('interesse',data.interesse||'vigilância');
        fd.append('mensagem',data.mensagem||'');
        fd.append('_gotcha',data._gotcha||'');
        const res=await fetch('https://formspree.io/f/xbdwbqov',{method:'POST',headers:{'Accept':'application/json'},body:fd});
        if(!res.ok) throw new Error('fail');
        form.style.display='none'; if(alt) alt.style.display='none';
        success.classList.add('show');
        success.scrollIntoView({behavior:reduce?'auto':'smooth',block:'center'});
        /* V5 · cerimónia de fecho — o radar trava a verde sobre o pedido recebido */
        if(window.RM && !reduce){
          window.RM.ceremony={on:true, t:0, done:false};
          if(window.RM.chord) window.RM.chord();
        }
      }catch(err){
        alert('Não foi possível enviar agora. Tente novamente ou contacte-nos em geral@radarmarca.pt');
        btn.disabled=false; btn.textContent=orig;
      }
    });
  }
});
