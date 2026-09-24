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
    act2:{p:0, flash:0}, // progresso do mini-filme da tese (0..1) e pulso de luz, escritos pelo bloco DOM
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

  /* (o som da sala de operações foi retirado na evolução visual de 2026-09 — sem AudioContext) */

  let W=0, H=0, dpr=1;
  function resize(){
    dpr = Math.min(window.devicePixelRatio||1, isMobile?1.5:2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W*dpr; canvas.height = H*dpr;
    canvas.style.width = W+'px'; canvas.style.height = H+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  resize(); window.addEventListener('resize', function(){ resize(); if(reduce) requestAnimationFrame(draw); });

  /* ---------- definição das cenas (parâmetros-alvo do radar) ---------- */
  // x,y em fração do viewport · r em fração de min(W,H) · alpha global
  // flags: label (a sua marca), red (alerta ignorado), green (lock final),
  // reticle (mira S3), beam (feixe horizontal S5), rings (nº de anéis)
  const SCENES = {
    hero:      {x:isMobile?.5:.62, y:.45, r:.62, alpha:1.00, sweep:0.007, label:isMobile?0:1, red:0, green:0, reticle:0, beam:0, named:0},
    tese:      {x:.5,  y:.5,  r:.85, alpha:0.34, sweep:0.004, label:0, red:1, green:0, reticle:0, beam:0, named:0},
    vigilancia:{x:.5,  y:.5,  r:.44, alpha:1.00, sweep:0.015, label:0, red:0, green:0, reticle:0, beam:0, named:1, anchor:'#radarStage'},
    registo:   {x:isMobile?.5:.72, y:isMobile?.22:.5, r:isMobile?.3:.40, alpha:0.30, sweep:0.008, label:0, red:0, green:0, reticle:0, beam:0, named:0, anchor:isMobile?null:'#priceboxRegisto'},
    funil:     {x:.5,  y:.30, r:.34, alpha:0.50, sweep:0.010, label:0, red:0, green:0, reticle:0, beam:1, named:0},
    ambient:   {x:.5,  y:.55, r:1.05, alpha:0.07, sweep:0.003, label:0, red:0, green:0, reticle:0, beam:0, named:0},
    final:     {x:.5,  y:isMobile?.18:.26, r:.42, alpha:0.55, sweep:0.008, label:isMobile?0:1, red:0, green:1, reticle:0, beam:0, named:0}
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
        } else {
          t.alpha *= 0.3;   /* a âncora saiu do ecrã: o radar recolhe-se, não fica a brilhar atrás dos cartões */
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
  }
  function endAlert(keepCard){
    if(stageEl) stageEl.classList.remove('alert');
    if(stageScanEl){ stageScanEl.textContent='● BPI · varrimento semanal'; stageScanEl.classList.remove('alert'); }
    if(keepCard) return;   /* o cartão "CONFLITO DETETADO" e a linha em alarme ficam — é informação */
    if(stageAlertEl) stageAlertEl.classList.remove('on');
    if(MARKS[1].row) MARKS[1].row.classList.remove('alarm');
  }
  const statScanEl=document.getElementById('statScan');
  let lastRev=-1;
  function updateDrama(){
    const active = activeScene==='vigilancia' && cur.named>0.6;
    if(!active){
      if(drama.state!=='idle'){ endAlert(false); drama.state='idle'; drama.prog=0; drama.cool=200; }
      return 1;
    }
    if(drama.state==='done') return 1;   /* já aconteceu nesta visita à cena */
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
      if(drama.t>150){ drama.state='release'; drama.t=0; endAlert(true); }
      return 0.12+(1-drama.prog)*0.88;   /* o tempo abranda */
    }
    /* release — o feixe retoma a velocidade; não volta a disparar até sair e voltar à cena */
    drama.t++; drama.prog=Math.max(0, 1-drama.t/40);
    if(drama.t>40){ drama.state='done'; drama.prog=0; }
    return 1;
  }

  /* crosshair interativo sobre o palco (desktop) */
  let cx=-1, cy=-1;
  if(stageEl && !isMobile){
    stageEl.addEventListener('pointermove',(e)=>{cx=e.clientX; cy=e.clientY;},{passive:true});
    stageEl.addEventListener('pointerleave',()=>{cx=-1;},{passive:true});
  }
  /* parallax do cursor (apenas hero) */
  let mx=0,my=0;
  if(!reduce){
    window.addEventListener('pointermove',(e)=>{
      mx=(e.clientX/W-.5)*10; my=(e.clientY/H-.5)*10;
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
    g.addColorStop(0,'rgba(241,228,195,0.5)');
    g.addColorStop(0.5,'rgba(241,228,195,0.1)');
    g.addColorStop(1,'rgba(241,228,195,0)');
    c.fillStyle=g; c.fillRect(0,0,256,256);
  }
  /* bloom — a luz do radar espalha-se pela página: sprite radial tungsténio sob os anéis,
     que viaja com o radar entre cenas (um drawImage por frame, zero alocação) */
  let bloomC=null;
  function bloomSprite(){
    bloomC=document.createElement('canvas'); bloomC.width=bloomC.height=256;
    const c=bloomC.getContext('2d');
    const g=c.createRadialGradient(128,128,0,128,128,128);
    g.addColorStop(0,'rgba(241,228,195,0.55)');
    g.addColorStop(0.35,'rgba(241,228,195,0.16)');
    g.addColorStop(0.7,'rgba(241,228,195,0.03)');
    g.addColorStop(1,'rgba(241,228,195,0)');
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
      else if(f2>=0.80){ filmMult=1.5; }         /* corte: o feixe reacende */
    }
    cur.x=lerp(cur.x,t.x,K); cur.y=lerp(cur.y,t.y,K); cur.r=lerp(cur.r,t.r,K);
    cur.alpha=lerp(cur.alpha,t.alpha,K); cur.sweep=lerp(cur.sweep,t.sweep,K);
    cur.label=lerp(cur.label,t.label,K); cur.red=lerp(cur.red,t.red,K);
    cur.green=lerp(cur.green,t.green,K); cur.reticle=lerp(cur.reticle,t.reticle,K);
    cur.beam=lerp(cur.beam,t.beam,K); cur.named=lerp(cur.named,t.named||0,K);

    ctx.clearRect(0,0,W,H);

    const parallaxOn = activeScene==='hero' ? 1 : 0;
    let ox = cur.x*W + mx*parallaxOn;
    let oy = cur.y*H + my*parallaxOn;
    /* V5 · fonte do specular/parallaxe: cursor no desktop, deriva de scroll no mobile */
    if(!reduce){
      const sxT=isMobile?Math.sin(window.scrollY*0.0012):mx/8;
      const syT=isMobile?Math.cos(window.scrollY*0.0009):my/8;
      shX+=(sxT-shX)*0.04; shY+=(syT-shY)*0.04;
    }
    const R  = cur.r*Math.min(W,H);
    const A  = cur.alpha;

    if(A < 0.01){ if(!reduce) requestAnimationFrame(draw); return; }

    /* pulso de luz (Ato II, último carimbo): decai sozinho */
    let fb=RM.act2.flash||0;
    if(fb>0){ fb=Math.max(0, fb-0.03); RM.act2.flash=fb; }

    /* bloom */
    if(!bloomC) bloomSprite();
    {
      const bs=R*4.2, bk=(isMobile?0.10:0.14)*A*(1+fb*0.9);
      ctx.globalAlpha=bk;
      ctx.drawImage(bloomC, ox-bs/2, oy-bs/2, bs, bs);
      ctx.globalAlpha=1;
    }

    /* anéis concêntricos — respiram suavemente na cena de vigilância */
    ctx.lineWidth=1;
    for(let i=1;i<=5;i++){
      const br=1;
      ctx.beginPath(); ctx.arc(ox,oy,R*i/5*br,0,TAU);
      ctx.strokeStyle='rgba(241,228,195,'+((0.11-i*0.013)*A)+')'; ctx.stroke();
    }
    /* cruz */
    ctx.strokeStyle='rgba(241,228,195,'+(0.07*A)+')';
    ctx.beginPath(); ctx.moveTo(ox-R,oy); ctx.lineTo(ox+R,oy);
    ctx.moveTo(ox,oy-R); ctx.lineTo(ox,oy+R); ctx.stroke();

    /* marcas de graus no anel exterior — contra-rotação lenta em vigilância */
    ctx.strokeStyle='rgba(241,228,195,'+(0.22*A)+')';
    for(let g=0; g<36; g++){
      const ga=g/36*TAU - sweep*0.07*cur.named;
      const r1=R*0.985, r2= g%9===0 ? R*0.94 : R*0.965;
      ctx.beginPath();
      ctx.moveTo(ox+Math.cos(ga)*r1, oy+Math.sin(ga)*r1);
      ctx.lineTo(ox+Math.cos(ga)*r2, oy+Math.sin(ga)*r2);
      ctx.stroke();
    }

    /* V5 · specular sheen — luz a deslizar sobre o latão gravado dos anéis */
    if(!reduce && !isMobile && Q.tier>=2 && cur.named<0.5 && A>0.15){
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
    if(!reduce && activeScene==='vigilancia' && statScanEl){
      const rev=Math.floor(sweep/TAU);
      if(rev!==lastRev){ lastRev=rev; statScanEl.textContent=(815+((rev*37)%55))+'/s'; }
    }
    ctx.save(); ctx.translate(ox,oy); ctx.rotate(sweep);
    if(ctx.createConicGradient){
      /* rasto de fósforo: brilha atrás da agulha e decai */
      const trail=(0.22+cur.named*0.16)*(1+fb*1.6);
      const cg=ctx.createConicGradient(0,0,0);
      cg.addColorStop(0,'rgba(241,228,195,'+(trail*1.4*A)+')');
      cg.addColorStop(0.02,'rgba(241,228,195,0)');
      cg.addColorStop(0.55,'rgba(241,228,195,0)');
      cg.addColorStop(1,'rgba(241,228,195,'+(trail*A)+')');
      ctx.beginPath(); ctx.arc(0,0,R,0,TAU);
      ctx.fillStyle=cg; ctx.fill();
    } else {
      const g=ctx.createLinearGradient(0,0,R,0);
      g.addColorStop(0,'rgba(241,228,195,'+(0.25*A)+')');
      g.addColorStop(1,'rgba(241,228,195,0)');
      ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0,0,R,-0.55,0.02); ctx.closePath();
      ctx.fillStyle=g; ctx.fill();
    }
    /* agulha */
    ctx.strokeStyle='rgba(217,164,65,'+(0.7*A)+')'; ctx.lineWidth=1.4;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(R,0); ctx.stroke();
    ctx.restore();

    /* centro */
    ctx.beginPath(); ctx.arc(ox,oy,4,0,TAU);
    ctx.fillStyle='rgba(217,164,65,'+A+')';
    ctx.shadowColor='#D9A441'; ctx.shadowBlur=18*A; ctx.fill(); ctx.shadowBlur=0;

    /* blips */
    const sweepA=((sweep%TAU)+TAU)%TAU;
    const dim=1-cur.named*0.75;   /* os blips genéricos cedem o palco aos nomes */
    for(const b of blips){
      let bx=ox+Math.cos(b.a)*R*b.r+shX*6;
      let by=oy+Math.sin(b.a)*R*b.r+shY*4;
      let ba=((b.a%TAU)+TAU)%TAU;
      let diff=Math.abs(sweepA-ba); if(diff>Math.PI) diff=TAU-diff;
      const lit=Math.max(0,1-diff*1.6);

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
        ctx.fillStyle='rgba(242,197,107,'+(0.9*ra)+')';
        ctx.shadowColor='#F2C56B'; ctx.shadowBlur=(16+filmRedBoost*14)*ra; ctx.fill(); ctx.shadowBlur=0;
        ctx.beginPath(); ctx.arc(bx,by,4+pulse*(26+filmRedBoost*18),0,TAU);
        ctx.strokeStyle='rgba(242,197,107,'+((1-pulse)*0.7*ra)+')'; ctx.lineWidth=1.2; ctx.stroke();
        if(cur.red>0.5 && activeScene==='tese' && !isMobile){
          ctx.font='10px JetBrains Mono, monospace';
          ctx.fillStyle='rgba(242,197,107,'+(0.9*ra)+')';
          ctx.fillText(RM.sosia ? RM.sosia+' (simulação)' : 'pedido colidente', bx+12, by+3);
        }
        continue;
      }

      const hot=b.hot;
      const base=hot?0.5:0.24;
      const alpha=(base+lit*0.6)*A*dim;
      const size=(hot?3.4:1.9)+lit*2.0;
      let fill;
      if(hot && cur.green>0.5) fill='rgba(142,169,214,'+alpha+')';
      else if(hot) fill='rgba(217,164,65,'+alpha+')';
      else fill='rgba(241,228,195,'+alpha+')';
      ctx.beginPath(); ctx.arc(bx,by,size,0,TAU);
      ctx.fillStyle=fill;
      if(lit>0.3){ctx.shadowColor=hot&&cur.green>0.5?'#8EA9D6':'#D9A441'; ctx.shadowBlur=14*lit*A;}
      ctx.fill(); ctx.shadowBlur=0;

      if(hot){
        const ringCol = cur.green>0.5 ? '142,169,214' : '217,164,65';
        ctx.beginPath(); ctx.arc(bx,by,size+8+lit*8,0,TAU);
        ctx.strokeStyle='rgba('+ringCol+','+((0.35+0.3*lit)*A)+')'; ctx.lineWidth=1.2; ctx.stroke();
        if(cur.green>0.5){
          /* lock verde: segundo anel fixo + ticks */
          ctx.beginPath(); ctx.arc(bx,by,size+18,0,TAU);
          ctx.strokeStyle='rgba(142,169,214,'+(0.5*A)+')'; ctx.stroke();
        }
        /* V5 · o blip dourado responde à escrita do visitante */
        if(RM.pulse>0){
          RM.pulse--;
          const pp=RM.pulse/34;
          ctx.beginPath(); ctx.arc(bx,by,size+10+(1-pp)*26,0,TAU);
          ctx.strokeStyle='rgba(217,164,65,'+(pp*0.7*A)+')'; ctx.lineWidth=1.4; ctx.stroke();
        }
        /* V5 · cerimónia de fecho — mira verde + anéis após o pedido enviado */
        if(RM.ceremony.on && cur.green>0.3){
          const c2=RM.ceremony; c2.t++;
          const pe=Math.min(1,c2.t/45), eo=1-Math.pow(1-pe,3);
          const dist=14+(1-eo)*70, Lb=10;
          ctx.strokeStyle='rgba(142,169,214,'+(0.95*eo*A)+')'; ctx.lineWidth=1.8;
          [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(function(cn){
            ctx.beginPath();
            ctx.moveTo(bx+cn[0]*dist-cn[0]*Lb, by+cn[1]*dist);
            ctx.lineTo(bx+cn[0]*dist, by+cn[1]*dist);
            ctx.lineTo(bx+cn[0]*dist, by+cn[1]*dist-cn[1]*Lb);
            ctx.stroke();
          });
          const rp=(c2.t%70)/70;
          ctx.beginPath(); ctx.arc(bx,by,dist+rp*46,0,TAU);
          ctx.strokeStyle='rgba(142,169,214,'+((1-rp)*0.5*A)+')'; ctx.lineWidth=1.2; ctx.stroke();
          if(c2.t>340){ c2.on=false; c2.done=true; }
        }
        if(cur.label>0.4){
          ctx.font='10px JetBrains Mono, monospace';
          ctx.fillStyle='rgba(244,238,222,'+((0.72+0.28*lit)*cur.label*A)+')';
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
        if(lit>0.5 && m._rv<1){ m._rv=Math.min(1, m._rv+0.055); }
        const txt1=m._rv>=1 ? line1 : (m._rv>0 ? line1.slice(0,Math.ceil(line1.length*m._rv))+'▌' : '');

        /* linha de dados centro → blip enquanto o feixe o lê */
        if(lit>0.5 && m._rv>0){
          ctx.setLineDash([3,6]);
          ctx.strokeStyle='rgba(241,228,195,'+((lit-0.5)*0.55*na)+')'; ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(ox,oy); ctx.lineTo(bx,by); ctx.stroke();
          ctx.setLineDash([]);
        }

        if(m.st==='conflict'){
          /* o pedido colidente — vermelho, pulso e onda de alerta */
          const pulse=(frame%120)/120;
          ctx.beginPath(); ctx.arc(bx,by,4.4,0,TAU);
          ctx.fillStyle='rgba(242,197,107,'+(0.95*na)+')';
          ctx.shadowColor='#F2C56B'; ctx.shadowBlur=22*na; ctx.fill(); ctx.shadowBlur=0;
          ctx.beginPath(); ctx.arc(bx,by,6+pulse*32,0,TAU);
          ctx.strokeStyle='rgba(242,197,107,'+((1-pulse)*0.75*na)+')'; ctx.lineWidth=1.3; ctx.stroke();
          ctx.font='600 '+fName+' JetBrains Mono, monospace';
          ctx.fillStyle='rgba(242,197,107,'+((0.85+0.15*lit)*na)+')';
          if(txt1) ctx.fillText(txt1, lx, by-6);
          if(m._rv>=1){
            ctx.font=fSub+' JetBrains Mono, monospace';
            ctx.fillStyle='rgba(242,197,107,'+(0.8*na)+')';
            ctx.fillText('CONFLITO DETETADO', lx, by+9);
          }
          /* lock: a mira fecha-se sobre o conflito e o palco pisca */
          if(drama.prog>0.01){
            const pe=1-Math.pow(1-drama.prog,3);
            const dist=12+(1-pe)*64, Lb=9;
            ctx.strokeStyle='rgba(242,197,107,'+(0.95*pe*na)+')'; ctx.lineWidth=1.7;
            [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(function(c){
              ctx.beginPath();
              ctx.moveTo(bx+c[0]*dist-c[0]*Lb, by+c[1]*dist);
              ctx.lineTo(bx+c[0]*dist, by+c[1]*dist);
              ctx.lineTo(bx+c[0]*dist, by+c[1]*dist-c[1]*Lb);
              ctx.stroke();
            });
            ctx.beginPath(); ctx.arc(bx,by,dist*1.5,0,TAU);
            ctx.strokeStyle='rgba(242,197,107,'+(0.3*pe*na)+')'; ctx.lineWidth=1; ctx.stroke();
          }
        } else if(m.st==='user'){
          /* V5 · a marca do visitante — dourada, com anel próprio */
          ctx.beginPath(); ctx.arc(bx,by,4.2,0,TAU);
          ctx.fillStyle='rgba(217,164,65,'+((0.6+0.4*lit)*na)+')';
          ctx.shadowColor='#D9A441'; ctx.shadowBlur=(14+8*lit)*na; ctx.fill(); ctx.shadowBlur=0;
          ctx.beginPath(); ctx.arc(bx,by,9+lit*5,0,TAU);
          ctx.strokeStyle='rgba(217,164,65,'+((0.4+0.3*lit)*na)+')'; ctx.lineWidth=1.2; ctx.stroke();
          ctx.font='600 '+fName+' JetBrains Mono, monospace';
          ctx.fillStyle='rgba(244,238,222,'+((0.72+0.28*lit)*na)+')';
          if(txt1) ctx.fillText(txt1, lx, by-6);
          if(m._rv>=1){
            ctx.font=fSub+' JetBrains Mono, monospace';
            ctx.fillStyle='rgba(242,197,107,'+((0.75+0.25*lit)*na)+')';
            ctx.fillText('A SUA MARCA · SIMULAÇÃO', lx, by+9);
          }
        } else if(m.st==='scan'){
          /* em análise — dourado, a piscar */
          const tw=(frame%90)<55;
          ctx.beginPath(); ctx.arc(bx,by,3.2,0,TAU);
          ctx.fillStyle='rgba(217,164,65,'+((tw?0.9:0.55)*na)+')';
          ctx.shadowColor='#D9A441'; ctx.shadowBlur=12*na; ctx.fill(); ctx.shadowBlur=0;
          ctx.font=fName+' JetBrains Mono, monospace';
          ctx.fillStyle='rgba(244,238,222,'+((0.66+0.34*lit)*na)+')';
          if(txt1) ctx.fillText(txt1, lx, by-6);
          if(m._rv>=1){
            ctx.font=fSub+' JetBrains Mono, monospace';
            ctx.fillStyle='rgba(242,197,107,'+((tw?0.85:0.62)*na)+')';
            ctx.fillText('A ANALISAR…', lx, by+9);
          }
        } else {
          /* sem conflito — verde, acende à passagem do feixe */
          ctx.beginPath(); ctx.arc(bx,by,3.2,0,TAU);
          ctx.fillStyle='rgba(142,169,214,'+((0.45+0.55*lit)*na)+')';
          if(lit>0.3){ctx.shadowColor='#8EA9D6'; ctx.shadowBlur=12*lit*na;}
          ctx.fill(); ctx.shadowBlur=0;
          ctx.font=fName+' JetBrains Mono, monospace';
          ctx.fillStyle='rgba(244,238,222,'+((0.66+0.34*lit)*na)+')';
          if(txt1) ctx.fillText(txt1, lx, by-6);
          if(m._rv>=1){
            ctx.font=fSub+' JetBrains Mono, monospace';
            ctx.fillStyle='rgba(142,169,214,'+((0.7+0.3*lit)*na)+')';
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
          ctx.strokeStyle='rgba(241,228,195,'+(0.2*na)+')'; ctx.lineWidth=1;
          ctx.beginPath();
          ctx.moveTo(sr.x+10,cy); ctx.lineTo(sr.x+sr.w-10,cy);
          ctx.moveTo(cx,sr.y+48); ctx.lineTo(cx,sr.y+sr.h-10);
          ctx.stroke();
          const dx2=cx-ox, dy2=cy-oy;
          const az=Math.round((Math.atan2(dy2,dx2)*180/Math.PI+360)%360);
          const rr2=Math.sqrt(dx2*dx2+dy2*dy2)/Math.max(R,1);
          ctx.font='9px JetBrains Mono, monospace'; ctx.textAlign='left';
          ctx.fillStyle='rgba(241,228,195,'+(0.8*na)+')';
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
      ctx.strokeStyle='rgba(217,164,65,'+(0.75*ra)+')'; ctx.lineWidth=1.6;
      for(let q=0;q<4;q++){
        ctx.beginPath(); ctx.arc(0,0,rr, q*Math.PI/2+0.18, q*Math.PI/2+Math.PI/2-0.18); ctx.stroke();
      }
      ctx.restore();
      /* cantos fixos */
      ctx.strokeStyle='rgba(217,164,65,'+(0.85*ra)+')'; ctx.lineWidth=2;
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
      gg.addColorStop(0,'rgba(241,228,195,'+(0.8*ba)+')');
      gg.addColorStop(1,'rgba(241,228,195,0)');
      ctx.strokeStyle=gg; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(ox,oy); ctx.lineTo(ox+bw,oy); ctx.stroke();
      const gg2=ctx.createLinearGradient(ox,0,ox-bw,0);
      gg2.addColorStop(0,'rgba(241,228,195,'+(0.8*ba)+')');
      gg2.addColorStop(1,'rgba(241,228,195,0)');
      ctx.strokeStyle=gg2;
      ctx.beginPath(); ctx.moveTo(ox,oy); ctx.lineTo(ox-bw,oy); ctx.stroke();
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

})();

/* =====================================================================
   ANIMAÇÕES DOM — CSS + IntersectionObserver, sem bibliotecas.
   Sem JS / sem IO / com reduced-motion: todo o conteúdo fica visível.
   ===================================================================== */
window.addEventListener('DOMContentLoaded', function(){
  const reduce = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  const isMobile = window.matchMedia('(max-width:760px)').matches;
  const hasIO = 'IntersectionObserver' in window;

  function showAll(){
    document.querySelectorAll('.reveal').forEach(e=>e.classList.add('visible'));
    document.querySelectorAll('.steps .step').forEach(e=>e.classList.add('on'));
    const tl=document.getElementById('timeline'); if(tl) tl.classList.add('on');
  }

  if(reduce || !hasIO){
    showAll();
  } else {
    document.body.classList.add('motion');

    /* reveals genéricos — uma vez, com stagger curto dentro do mesmo lote.
       Cartões de preço, consola, FAQ e formulário são excluídos no CSS (sempre visíveis). */
    const io = new IntersectionObserver((entries)=>{
      let i=0;
      entries.forEach(en=>{
        if(!en.isIntersecting) return;
        const el=en.target;
        el.style.transitionDelay = Math.min(i,4)*70+'ms';
        el.classList.add('visible');
        io.unobserve(el); i++;
      });
    }, {rootMargin:'0px 0px -12% 0px', threshold:0});
    document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

    /* timeline do funil — a linha desenha-se e os nós acendem em sequência (uma vez) */
    const tl=document.getElementById('timeline');
    if(tl){
      const steps=tl.querySelectorAll('.steps .step');
      const io2=new IntersectionObserver((en)=>{
        if(!en.some(e=>e.isIntersecting)) return;
        io2.disconnect();
        tl.classList.add('on');
        steps.forEach((s,i)=>setTimeout(()=>s.classList.add('on'), 260+i*260));
      }, {rootMargin:'0px 0px -22% 0px', threshold:0});
      io2.observe(tl);
    }

    /* ===== ATO II — a tese vira mini-filme (o desastre em silêncio) =====
       Desktop: a secção é alta (240vh) e o conteúdo fica sticky — o scroll é o projetor;
       voltar atrás re-projeta. Mobile: sem sticky — o filme corre uma vez, em 4.5s,
       quando a secção entra no viewport. */
    (function(){
      const tese=document.querySelector('.tese');
      if(!tese) return;
      const lbT=document.getElementById('lbTop'), lbB=document.getElementById('lbBot');
      const stampEl=document.getElementById('teseStamp');
      const STAMPS=['PEDIDO PUBLICADO NO BPI','O TITULAR NÃO FOI NOTIFICADO','O PRAZO LEGAL ESGOTA-SE…','— A MENOS QUE ALGUÉM ESTEJA A VIGIAR'];
      let lastBeat=-2, flashed=false;
      function filmUpdate(p, lite){
        if(window.RM) window.RM.act2.p=p;
        if(!lite && lbT && lbB){
          const inFilm=p>0.02&&p<0.98;
          const lbk=inFilm?Math.min(1, Math.min(p/0.12,(1-p)/0.12)):0;
          lbT.style.transform='scaleY('+lbk.toFixed(3)+')'; lbB.style.transform='scaleY('+lbk.toFixed(3)+')';
        }
        let beat=-1;
        if(p>0.18)beat=0; if(p>0.40)beat=1; if(p>0.60)beat=2; if(p>0.80)beat=3;
        if(beat!==lastBeat && stampEl){
          const prev=lastBeat; lastBeat=beat;
          if(beat>=0){
            stampEl.textContent=STAMPS[beat];
            stampEl.style.opacity=1;
            /* pulso de luz do feixe (no canvas): 1× por sessão, só quando se chega ao
               último carimbo vindo do anterior (nunca num deep-link ou scroll a saltar) */
            if(beat===3 && prev===2 && !flashed && window.RM){ flashed=true; window.RM.act2.flash=1; }
          } else { stampEl.style.opacity=0; }
        }
      }
      if(!isMobile){
        let lastP=-1;
        function onTeseScroll(){
          const rc=tese.getBoundingClientRect();
          const total=rc.height-window.innerHeight;
          if(total<=0) return;
          if(rc.bottom<=0 || rc.top>=window.innerHeight){
            /* fora do ecrã: garante letterbox fechado e estado coerente */
            const edge=rc.top>0?0:1;
            if(lastP!==edge){ lastP=edge; filmUpdate(edge,false); }
            return;
          }
          let p=(-rc.top)/total; p=Math.max(0,Math.min(1,p));
          if(Math.abs(p-lastP)<0.002) return;
          lastP=p; filmUpdate(p,false);
        }
        window.addEventListener('scroll', onTeseScroll, {passive:true});
        window.addEventListener('resize', onTeseScroll, {passive:true});
        onTeseScroll();
      } else {
        const io3=new IntersectionObserver((en)=>{
          if(!en.some(e=>e.isIntersecting)) return;
          io3.disconnect();
          const rc=tese.getBoundingClientRect();
          if(rc.bottom<0 || rc.top>window.innerHeight){ filmUpdate(1,true); return; }
          const t0=performance.now();
          (function step(now){
            const p=Math.min(1,(now-t0)/4500);
            filmUpdate(p,true);
            if(p<1) requestAnimationFrame(step);
          })(t0);
        }, {rootMargin:'0px 0px -40% 0px', threshold:0});
        io3.observe(tese);
      }
    })();
  }

  /* ---------- formulário (Formspree) ---------- */
  const form=document.getElementById('cform');
  if(form){
    const success=document.getElementById('cform-success');
    const alt=document.querySelector('.cform-alt');
    const btn=document.getElementById('cform-submit');
    /* CTAs com data-intent pré-selecionam o interesse (vigilância / registo) */
    document.querySelectorAll('a[data-intent]').forEach(a=>{
      a.addEventListener('click', ()=>{
        const v=a.dataset.intent==='registo' ? 'registo' : 'vigilância';
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
        /* V5 · cerimónia de fecho — o radar trava sobre o pedido recebido */
        if(window.RM && !reduce){
          window.RM.ceremony={on:true, t:0, done:false};
        }
      }catch(err){
        alert('Não foi possível enviar agora. Tente novamente ou contacte-nos em geral@radarmarca.pt');
        btn.disabled=false; btn.textContent=orig;
      }
    });
  }
});
