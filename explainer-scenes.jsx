// Radar Marca — Animated Explainer (~32s)
// Scenes use the animations.jsx primitives: <Stage>, <Sprite>, useTime, useSprite, Easing, interpolate.

const C = {
  ink: '#0B1F3A',
  ink2: '#0F2745',
  cream: '#FAF9F6',
  creamDim: 'rgba(250,249,246,0.62)',
  creamFaint: 'rgba(250,249,246,0.38)',
  gold: '#D4A038',
  goldBright: '#E8B856',
  red: '#E5604A',
  line: 'rgba(250,249,246,0.14)',
};

const F = {
  serif: "'Instrument Serif', ui-serif, Georgia, serif",
  sans: "'Inter Tight', system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
};

// ── small reusable easings via animations.jsx globals
const E = Easing;

// helper: clamp + map
const lerp = (a, b, t) => a + (b - a) * t;
const mapClamp = (t, a, b, ea = E.easeOutCubic) => {
  const x = clamp((t - a) / (b - a), 0, 1);
  return ea(x);
};

// ─── Persistent grid bg ──────────────────────────────────────────────────────
function GridBG() {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      backgroundImage:
        'linear-gradient(rgba(250,249,246,0.03) 1px, transparent 1px),' +
        'linear-gradient(90deg, rgba(250,249,246,0.03) 1px, transparent 1px)',
      backgroundSize: '80px 80px',
      maskImage: 'radial-gradient(ellipse 75% 65% at center, black 30%, transparent 80%)',
      WebkitMaskImage: 'radial-gradient(ellipse 75% 65% at center, black 30%, transparent 80%)',
    }} />
  );
}

// ─── Top + bottom annotations (persistent) ───────────────────────────────────
function ChromeAnnotations() {
  const t = useTime();
  return (
    <React.Fragment>
      {/* top-left annotation */}
      <div style={{
        position: 'absolute', top: 48, left: 64, right: 64,
        display: 'flex', justifyContent: 'space-between',
        fontFamily: F.mono, fontSize: 16, letterSpacing: '0.16em', textTransform: 'uppercase',
        color: C.creamFaint,
      }}>
        <span>radarmarca.pt</span>
        <span style={{ color: C.gold, display: 'inline-flex', gap: 10, alignItems: 'center' }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', background: C.gold,
            boxShadow: `0 0 10px ${C.gold}`,
            opacity: 0.4 + 0.6 * Math.abs(Math.sin(t * 2.2)),
          }}/>
          Vigilância de marca · Portugal
        </span>
      </div>

      {/* bottom timeline */}
      <div style={{
        position: 'absolute', bottom: 48, left: 64, right: 64,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontFamily: F.mono, fontSize: 14, letterSpacing: '0.18em', textTransform: 'uppercase',
        color: C.creamFaint,
      }}>
        <span>0{Math.min(6, Math.max(1, Math.ceil(t / 32 * 6)))} / 06</span>
        <div style={{ flex: 1, height: 1, background: C.line, margin: '0 24px', position: 'relative' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${(t / 32) * 100}%`, background: C.gold,
            boxShadow: `0 0 10px ${C.gold}`,
          }}/>
        </div>
        <span>{String(Math.floor(t)).padStart(2, '0')}″ / 32″</span>
      </div>
    </React.Fragment>
  );
}

// ─── Helper Text component for animated reveals ──────────────────────────────
function AText({
  text, x, y, size = 80, color = C.cream, font = F.serif, weight = 400,
  italic = false, align = 'left', delay = 0, dur = 0.7, letterSpacing = '-0.025em',
  style = {},
}) {
  const { localTime } = useSprite();
  const t = mapClamp(localTime, delay, delay + dur, E.easeOutCubic);
  const tx = align === 'center' ? '-50%' : align === 'right' ? '-100%' : '0';
  return (
    <div style={{
      position: 'absolute', left: x, top: y,
      transform: `translate(${tx}, ${(1 - t) * 14}px)`,
      opacity: t,
      fontFamily: font, fontSize: size, fontWeight: weight,
      fontStyle: italic ? 'italic' : 'normal',
      color, letterSpacing, whiteSpace: 'pre',
      lineHeight: 0.95, willChange: 'transform, opacity',
      ...style,
    }}>{text}</div>
  );
}

// ─── Eyebrow: chapter title with hairline ────────────────────────────────────
function Eyebrow({ x, y, num, text, delay = 0, color = C.gold }) {
  const { localTime } = useSprite();
  const t = mapClamp(localTime, delay, delay + 0.5);
  const w = lerp(0, 36, t);
  return (
    <div style={{
      position: 'absolute', left: x, top: y,
      display: 'flex', alignItems: 'center', gap: 16,
      fontFamily: F.mono, fontSize: 16, letterSpacing: '0.18em',
      textTransform: 'uppercase', color, opacity: t,
    }}>
      <span style={{ width: w, height: 1, background: color, display: 'inline-block' }}/>
      <span>{num} — {text}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 1: "Tem uma marca."  (0 → 5s)
// ═══════════════════════════════════════════════════════════════════════════
function Scene1() {
  return (
    <Sprite start={0} end={5.2}>
      <Eyebrow x={120} y={140} num="01" text="Há algo seu, lá fora." delay={0.2} />
      <AText x={120} y={240} text="Tem uma marca." size={260} delay={0.6} dur={0.9} />
      <AText x={120} y={520} italic text="registada no INPI." size={200} color={C.gold} delay={1.6} dur={0.8} />
      <AText
        x={120} y={760}
        text={"Trabalhou anos por ela.\nO nome é seu. O logótipo é seu."}
        size={36} color={C.creamDim} weight={400} font={F.sans}
        letterSpacing="-0.005em"
        delay={2.6} dur={0.8}
        style={{ lineHeight: 1.4 }}
      />
    </Sprite>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 2: "Mas o INPI não a defende sozinho." (5 → 11s)
// ═══════════════════════════════════════════════════════════════════════════
function Scene2() {
  return (
    <Sprite start={5.2} end={11}>
      <Eyebrow x={120} y={140} num="02" text="A ameaça" delay={0.2} color={C.red} />
      <AText
        x={120} y={240}
        text={"Mas o INPI\nnão a defende"}
        size={180} delay={0.5} dur={0.8}
        style={{ lineHeight: 0.95 }}
      />
      <AText
        x={120} y={600}
        italic text="sozinho."
        size={180} color={C.gold} delay={1.2} dur={0.8}
      />

      {/* Stack of fake similar brand names appearing on the right */}
      <ConflictStack delay={2.2} />
    </Sprite>
  );
}

function ConflictStack({ delay }) {
  const items = [
    { name: 'MARCA DA CASA', cl: 'cl. 25', t: 0 },
    { name: 'Marca de Casa, Lda', cl: 'cl. 35', t: 0.4 },
    { name: 'MarcaDaCasa®', cl: 'cl. 41', t: 0.8 },
    { name: 'CASA DA MARCA', cl: 'cl. 25', t: 1.2 },
  ];
  const { localTime } = useSprite();
  return (
    <div style={{ position: 'absolute', right: 120, top: 280, width: 640 }}>
      <div style={{
        fontFamily: F.mono, fontSize: 16, letterSpacing: '0.16em',
        textTransform: 'uppercase', color: C.creamFaint, marginBottom: 28,
        opacity: mapClamp(localTime, delay, delay + 0.4),
      }}>
        Pedidos publicados esta semana
      </div>
      {items.map((it, i) => {
        const t = mapClamp(localTime, delay + 0.3 + it.t, delay + 0.8 + it.t);
        return (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '22px 28px',
            border: `1px solid ${C.line}`, borderRadius: 12,
            background: 'rgba(229,96,74,0.04)',
            marginBottom: 14,
            opacity: t,
            transform: `translateX(${(1 - t) * 30}px)`,
            willChange: 'transform, opacity',
          }}>
            <span style={{ fontFamily: F.sans, fontSize: 32, fontWeight: 500, color: C.cream }}>
              {it.name}
            </span>
            <span style={{
              fontFamily: F.mono, fontSize: 14, letterSpacing: '0.14em',
              color: C.red, textTransform: 'uppercase',
              border: `1px solid rgba(229,96,74,0.4)`, padding: '6px 12px', borderRadius: 999,
            }}>conflito</span>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 3: Radar scan (11 → 18s)
// ═══════════════════════════════════════════════════════════════════════════
function Scene3() {
  return (
    <Sprite start={11} end={18}>
      <Eyebrow x={120} y={140} num="03" text="O Radar Marca" delay={0.2} />
      <AText
        x={120} y={240}
        text="Todas as semanas"
        size={130} delay={0.5} dur={0.7}
      />
      <AText
        x={120} y={410}
        italic text="vemos o BPI por si."
        size={130} color={C.gold} delay={1} dur={0.7}
      />
      <AText
        x={120} y={620}
        text={"Cada edição do Boletim da Propriedade Industrial\npassa pelo nosso sistema. Sem falhas. Sem pausas."}
        size={28} color={C.creamDim} weight={400} font={F.sans}
        letterSpacing="-0.005em"
        delay={1.8} dur={0.7}
        style={{ lineHeight: 1.5 }}
      />

      <RadarVisualization x={1180} y={250} size={620} delay={0.4} />
    </Sprite>
  );
}

function RadarVisualization({ x, y, size, delay = 0 }) {
  const { localTime } = useSprite();
  const appear = mapClamp(localTime, delay, delay + 0.8, E.easeOutCubic);
  const angle = localTime * 90; // degrees/sec
  return (
    <div style={{
      position: 'absolute', left: x, top: y, width: size, height: size,
      opacity: appear, transform: `scale(${0.85 + 0.15 * appear})`,
      transformOrigin: 'center',
    }}>
      <svg viewBox="-300 -300 600 600" style={{ width: '100%', height: '100%' }}>
        <defs>
          <radialGradient id="rgrad" cx="0" cy="0" r="260" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={C.gold} stopOpacity="0"/>
            <stop offset="100%" stopColor={C.gold} stopOpacity="0.32"/>
          </radialGradient>
        </defs>
        <g fill="none" stroke="rgba(250,249,246,0.12)" strokeWidth="1">
          <circle r="80"/><circle r="160"/><circle r="240"/>
        </g>
        <g stroke="rgba(250,249,246,0.08)" strokeWidth="1">
          <line x1="-280" y1="0" x2="280" y2="0"/>
          <line x1="0" y1="-280" x2="0" y2="280"/>
        </g>

        {/* sweep wedge */}
        <g transform={`rotate(${angle})`}>
          <path d="M0,0 L260,0 A260,260 0 0,1 184,184 Z" fill="url(#rgrad)"/>
          <line x1="0" y1="0" x2="260" y2="0" stroke={C.goldBright} strokeWidth="2"/>
        </g>

        {/* blips */}
        {[
          { x: -120, y: -80, color: C.gold, on: 0.6 },
          { x: 140, y: -100, color: C.gold, on: 1.4 },
          { x: -160, y: 120, color: C.gold, on: 2.2 },
          { x: 80, y: 170, color: C.gold, on: 3.0 },
          { x: 200, y: 40, color: C.gold, on: 3.8 },
        ].map((b, i) => {
          const phase = Math.max(0, localTime - delay - b.on);
          const a = phase > 0 ? Math.max(0, 1 - phase / 2.5) : 0;
          const r = phase > 0 ? 4 + phase * 8 : 4;
          return (
            <g key={i} opacity={a}>
              <circle cx={b.x} cy={b.y} r={4} fill={b.color}/>
              <circle cx={b.x} cy={b.y} r={r} fill="none" stroke={b.color} strokeWidth="1"/>
            </g>
          );
        })}

        <circle r="5" fill={C.goldBright}/>
        <circle r="11" fill="none" stroke={C.gold} strokeOpacity="0.5"/>
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 4: Conflict alert (18 → 24s)
// ═══════════════════════════════════════════════════════════════════════════
function Scene4() {
  return (
    <Sprite start={18} end={24}>
      <Eyebrow x={120} y={140} num="04" text="Conflito detectado" delay={0.2} color={C.red} />
      <AText
        x={120} y={240}
        text="Em até"
        size={120} delay={0.5} dur={0.6}
      />
      <AText
        x={120} y={400}
        italic text="48 horas,"
        size={260} color={C.gold} delay={1} dur={0.9}
      />
      <AText
        x={120} y={720}
        text="recebe um alerta."
        size={100} delay={2} dur={0.7}
      />

      <AlertCard delay={1.4} />
    </Sprite>
  );
}

function AlertCard({ delay }) {
  const { localTime } = useSprite();
  const t = mapClamp(localTime, delay, delay + 0.7, E.easeOutCubic);
  return (
    <div style={{
      position: 'absolute', right: 120, top: 280, width: 640,
      border: `1px solid rgba(229,96,74,0.5)`,
      borderRadius: 16,
      background: 'rgba(229,96,74,0.06)',
      padding: 32,
      opacity: t, transform: `translateX(${(1 - t) * 40}px)`,
      boxShadow: `0 30px 80px rgba(0,0,0,0.4)`,
    }}>
      <div style={{
        fontFamily: F.mono, fontSize: 14, letterSpacing: '0.18em', textTransform: 'uppercase',
        color: C.red, marginBottom: 24,
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span>● Alerta · BPI 21/2026</span>
        <span style={{ color: C.creamFaint }}>Hoje, 09:14</span>
      </div>
      <div style={{
        fontFamily: F.sans, fontSize: 14, color: C.creamFaint,
        textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8,
      }}>Marca conflituante</div>
      <div style={{
        fontFamily: F.serif, fontSize: 64, color: C.cream, letterSpacing: '-0.02em',
        lineHeight: 1, marginBottom: 28,
      }}>MARCA DA CASA</div>
      <div style={{ display: 'flex', gap: 36, fontFamily: F.mono, fontSize: 14, color: C.creamDim, letterSpacing: '0.08em' }}>
        <div><div style={{ color: C.creamFaint, fontSize: 11, marginBottom: 4 }}>SEMELHANÇA</div><div style={{ color: C.red, fontSize: 22 }}>87%</div></div>
        <div><div style={{ color: C.creamFaint, fontSize: 11, marginBottom: 4 }}>CLASSE</div><div style={{ fontSize: 22, color: C.cream }}>cl. 25</div></div>
        <div><div style={{ color: C.creamFaint, fontSize: 11, marginBottom: 4 }}>OPOSIÇÃO ATÉ</div><div style={{ fontSize: 22, color: C.cream }}>14·07·26</div></div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 5: Price (24 → 28.5s)
// ═══════════════════════════════════════════════════════════════════════════
function Scene5() {
  return (
    <Sprite start={24} end={28.5}>
      <Eyebrow x={120} y={140} num="05" text="Preço" delay={0.2} />
      <AText x={120} y={230} text="Um pagamento." delay={0.4} dur={0.7} size={90} font={F.sans} weight={500} letterSpacing="-0.015em" />
      <AText x={120} y={340} italic text="Dez anos descansado." delay={0.9} dur={0.7} size={90} color={C.creamDim} />

      <PriceDisplay delay={0.6} />
    </Sprite>
  );
}

function PriceDisplay({ delay }) {
  const { localTime } = useSprite();
  const t = mapClamp(localTime, delay, delay + 0.9, E.easeOutCubic);
  const dotPulse = 0.6 + 0.4 * Math.abs(Math.sin(localTime * 3));
  return (
    <div style={{
      position: 'absolute', left: 120, top: 480,
      display: 'flex', alignItems: 'flex-start',
      fontFamily: F.serif, color: C.cream,
      letterSpacing: '-0.05em', lineHeight: 0.85,
      opacity: t, transform: `translateY(${(1 - t) * 40}px)`,
    }}>
      <span style={{ fontSize: 200, fontStyle: 'italic', color: C.gold, marginTop: 30, marginRight: 6 }}>€</span>
      <span style={{ fontSize: 540, position: 'relative' }}>
        240
        <span style={{
          position: 'absolute', right: -60, bottom: 80,
          width: 36, height: 36, borderRadius: '50%',
          background: C.gold, boxShadow: `0 0 ${30 * dotPulse}px ${C.gold}`,
          opacity: t * dotPulse,
        }}/>
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 6: Logo + URL (28.5 → 32s)
// ═══════════════════════════════════════════════════════════════════════════
function Scene6() {
  return (
    <Sprite start={28.5} end={32}>
      <SignOff />
    </Sprite>
  );
}

function SignOff() {
  const { localTime } = useSprite();
  const tLogo = mapClamp(localTime, 0, 0.8, E.easeOutCubic);
  const tLine = mapClamp(localTime, 0.4, 1.0);
  const tURL = mapClamp(localTime, 0.8, 1.4);
  const tCTA = mapClamp(localTime, 1.2, 1.8);
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 60,
    }}>
      {/* Lockup */}
      <div style={{
        opacity: tLogo, transform: `scale(${0.92 + 0.08 * tLogo})`,
      }}>
        <img src="brand/lockup-horizontal-on-navy.svg" alt="" style={{ width: 920 }} />
      </div>

      {/* gold rule */}
      <div style={{
        width: lerp(0, 380, tLine), height: 1,
        background: C.gold, opacity: tLine,
        boxShadow: `0 0 10px ${C.gold}`,
      }}/>

      <div style={{
        fontFamily: F.mono, fontSize: 24, letterSpacing: '0.2em',
        textTransform: 'uppercase', color: C.cream,
        opacity: tURL, transform: `translateY(${(1 - tURL) * 10}px)`,
      }}>radarmarca.pt</div>

      <div style={{
        opacity: tCTA, transform: `translateY(${(1 - tCTA) * 10}px)`,
        fontFamily: F.serif, fontStyle: 'italic', fontSize: 44, color: C.gold,
      }}>
        Proteja a sua marca hoje.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SOUND — synthesized via Web Audio API (no audio files)
// ═══════════════════════════════════════════════════════════════════════════
function noiseBuffer(ctx, dur) {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
  return buf;
}

const SFX = {
  whoosh(ctx, masterGain, level = 0.6, dur = 0.55, fromHz = 1200, toHz = 240) {
    const t0 = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, dur);
    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.Q.value = 1.6;
    filt.frequency.setValueAtTime(fromHz, t0);
    filt.frequency.exponentialRampToValueAtTime(toHz, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(level, t0 + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filt).connect(g).connect(masterGain);
    src.start();
    src.stop(t0 + dur);
  },

  ping(ctx, masterGain, freq = 880, dur = 0.45, level = 0.18, type = 'sine') {
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(level, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g).connect(masterGain);
    osc.start(t0);
    osc.stop(t0 + dur);
  },

  tap(ctx, masterGain, level = 0.12) {
    const t0 = ctx.currentTime;
    const dur = 0.06;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, dur);
    const filt = ctx.createBiquadFilter();
    filt.type = 'highpass';
    filt.frequency.value = 1800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(level, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filt).connect(g).connect(masterGain);
    src.start(t0);
    src.stop(t0 + dur);
  },

  alertBeep(ctx, masterGain) {
    SFX.ping(ctx, masterGain, 740, 0.16, 0.22, 'square');
    setTimeout(() => SFX.ping(ctx, masterGain, 740, 0.16, 0.22, 'square'), 210);
  },

  chime(ctx, masterGain) {
    const t0 = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + i * 0.04);
      g.gain.exponentialRampToValueAtTime(0.16 / (i + 1), t0 + i * 0.04 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 1.6);
      osc.connect(g).connect(masterGain);
      osc.start(t0 + i * 0.04);
      osc.stop(t0 + 1.7);
    });
  },

  stamp(ctx, masterGain) {
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t0);
    osc.frequency.exponentialRampToValueAtTime(45, t0 + 0.45);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.45);
    osc.connect(g).connect(masterGain);
    osc.start(t0);
    osc.stop(t0 + 0.5);
  },

  sweepUp(ctx, masterGain) {
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, t0);
    osc.frequency.exponentialRampToValueAtTime(420, t0 + 0.7);
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 600;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.1);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.75);
    osc.connect(filt).connect(g).connect(masterGain);
    osc.start(t0);
    osc.stop(t0 + 0.8);
  },
};

function makeDrone(ctx, masterGain) {
  const nodes = [];
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = 280;
  filt.Q.value = 1.2;
  const droneGain = ctx.createGain();
  droneGain.gain.value = 0;
  droneGain.gain.linearRampToValueAtTime(0.045, ctx.currentTime + 2);
  filt.connect(droneGain).connect(masterGain);
  [55, 55.5, 82.5].forEach((f) => {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = f;
    osc.connect(filt);
    osc.start();
    nodes.push(osc);
  });
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 0.07;
  lfoGain.gain.value = 60;
  lfo.connect(lfoGain).connect(filt.frequency);
  lfo.start();
  nodes.push(lfo);
  return { stop: () => nodes.forEach(n => { try { n.stop(); } catch {} }) };
}

function getAudioEvents() {
  return [
    { at: 0.62, fn: (ctx, g) => SFX.whoosh(ctx, g, 0.55) },
    { at: 1.65, fn: (ctx, g) => SFX.whoosh(ctx, g, 0.5, 0.65, 800, 180) },
    { at: 2.7,  fn: (ctx, g) => SFX.tap(ctx, g, 0.08) },

    { at: 5.4,  fn: (ctx, g) => SFX.whoosh(ctx, g, 0.5, 0.8, 600, 120) },
    { at: 6.05, fn: (ctx, g) => SFX.whoosh(ctx, g, 0.45, 0.65) },
    { at: 7.5,  fn: (ctx, g) => { SFX.tap(ctx, g, 0.14); SFX.ping(ctx, g, 220, 0.22, 0.1, 'sawtooth'); } },
    { at: 7.9,  fn: (ctx, g) => { SFX.tap(ctx, g, 0.14); SFX.ping(ctx, g, 200, 0.22, 0.1, 'sawtooth'); } },
    { at: 8.3,  fn: (ctx, g) => { SFX.tap(ctx, g, 0.14); SFX.ping(ctx, g, 180, 0.22, 0.1, 'sawtooth'); } },
    { at: 8.7,  fn: (ctx, g) => { SFX.tap(ctx, g, 0.14); SFX.ping(ctx, g, 160, 0.22, 0.1, 'sawtooth'); } },

    { at: 11.3, fn: (ctx, g) => SFX.sweepUp(ctx, g) },
    { at: 11.6, fn: (ctx, g) => SFX.whoosh(ctx, g, 0.45) },
    { at: 12.6, fn: (ctx, g) => SFX.ping(ctx, g, 1100, 0.35, 0.12) },
    { at: 13.4, fn: (ctx, g) => SFX.ping(ctx, g, 1100, 0.35, 0.12) },
    { at: 14.2, fn: (ctx, g) => SFX.ping(ctx, g, 1100, 0.35, 0.12) },
    { at: 15.0, fn: (ctx, g) => SFX.ping(ctx, g, 1100, 0.35, 0.12) },
    { at: 15.8, fn: (ctx, g) => SFX.ping(ctx, g, 1100, 0.35, 0.12) },
    { at: 16.6, fn: (ctx, g) => SFX.ping(ctx, g, 1100, 0.35, 0.12) },

    { at: 18.2, fn: (ctx, g) => SFX.alertBeep(ctx, g) },
    { at: 19.0, fn: (ctx, g) => SFX.whoosh(ctx, g, 0.55, 0.75, 400, 100) },
    { at: 19.4, fn: (ctx, g) => SFX.whoosh(ctx, g, 0.55, 0.85, 1400, 200) },
    { at: 20.0, fn: (ctx, g) => SFX.tap(ctx, g, 0.14) },
    { at: 20.2, fn: (ctx, g) => SFX.tap(ctx, g, 0.12) },

    { at: 24.4, fn: (ctx, g) => SFX.whoosh(ctx, g, 0.5) },
    { at: 24.85, fn: (ctx, g) => SFX.chime(ctx, g) },

    { at: 28.6, fn: (ctx, g) => SFX.stamp(ctx, g) },
    { at: 29.4, fn: (ctx, g) => SFX.whoosh(ctx, g, 0.35, 0.55, 2400, 500) },
    { at: 30.4, fn: (ctx, g) => SFX.ping(ctx, g, 1320, 1.2, 0.1) },
  ];
}

function SoundDirector({ enabled, ctxRef, masterRef }) {
  const t = useTime();
  const prevRef = React.useRef(0);
  const eventsRef = React.useRef(null);
  if (!eventsRef.current) eventsRef.current = getAudioEvents();

  React.useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = t;
    if (!enabled || !ctxRef.current || !masterRef.current) return;
    const ctx = ctxRef.current;
    const master = masterRef.current;
    const looped = prev > t + 1;
    if (looped) {
      eventsRef.current.forEach(ev => {
        if (ev.at >= prev || ev.at < t) ev.fn(ctx, master);
      });
    } else {
      eventsRef.current.forEach(ev => {
        if (ev.at >= prev && ev.at < t) ev.fn(ctx, master);
      });
    }
  }, [t, enabled, ctxRef, masterRef]);

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// APP
// ═══════════════════════════════════════════════════════════════════════════
function ExplainerApp() {
  const [audioOn, setAudioOn] = React.useState(false);
  const ctxRef = React.useRef(null);
  const masterRef = React.useRef(null);
  const droneRef = React.useRef(null);

  const toggleAudio = () => {
    if (audioOn) {
      if (masterRef.current && ctxRef.current) {
        masterRef.current.gain.setValueAtTime(0, ctxRef.current.currentTime);
      }
      setAudioOn(false);
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!ctxRef.current) ctxRef.current = new Ctx();
    const ctx = ctxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    if (!masterRef.current) {
      masterRef.current = ctx.createGain();
      masterRef.current.gain.value = 1;
      masterRef.current.connect(ctx.destination);
    } else {
      masterRef.current.gain.setValueAtTime(1, ctx.currentTime);
    }
    if (!droneRef.current) droneRef.current = makeDrone(ctx, masterRef.current);
    setAudioOn(true);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Stage
        width={1920}
        height={1080}
        duration={32}
        background={C.ink}
        loop={true}
        autoplay={true}
        persistKey="rm-explainer"
      >
        <GridBG />
        <ChromeAnnotations />

        <Scene1 />
        <Scene2 />
        <Scene3 />
        <Scene4 />
        <Scene5 />
        <Scene6 />

        <SoundDirector
          enabled={audioOn}
          ctxRef={ctxRef}
          masterRef={masterRef}
        />
      </Stage>

      <button
        onClick={toggleAudio}
        style={{
          position: 'absolute',
          top: 16, right: 16,
          zIndex: 20,
          padding: '10px 18px',
          borderRadius: 999,
          border: `1px solid ${audioOn ? C.gold : 'rgba(250,249,246,0.25)'}`,
          background: audioOn ? 'rgba(212,160,56,0.14)' : 'rgba(11,31,58,0.7)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          color: audioOn ? C.gold : C.cream,
          fontFamily: F.mono,
          fontSize: 12,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
        }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: audioOn ? C.gold : 'rgba(250,249,246,0.4)',
          boxShadow: audioOn ? `0 0 8px ${C.gold}` : 'none',
        }}/>
        {audioOn ? 'Som ligado' : 'Activar som'}
      </button>
    </div>
  );
}

Object.assign(window, { ExplainerApp });
