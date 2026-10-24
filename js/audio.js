// 딱지왕 키우기 - procedural audio (Web Audio only, no assets).
// Every entry point is guarded: no AudioContext (Node, old browsers) => silent no-op.

let ctx = null, sfxBus = null, musicBus = null, nbuf = null;
let want = null;          // track name requested by the game
let cur = null;           // active sequencer
let timer = 0;            // scheduler interval id
let ch = null;            // charge-tone nodes
const AHEAD = 0.1, TICK = 25, XFADE = 0.4;

const hidden = () => typeof document !== 'undefined' && document.hidden;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

// ---------- engine ----------
function ensure() {
  if (ctx) return ctx;
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.knee.value = 20; comp.ratio.value = 6;
  comp.attack.value = 0.003; comp.release.value = 0.2;
  comp.connect(ctx.destination);
  sfxBus = ctx.createGain(); sfxBus.gain.value = 0.5; sfxBus.connect(comp);
  musicBus = ctx.createGain(); musicBus.gain.value = 0.12; musicBus.connect(comp);
  nbuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = nbuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

function tone(dest, t, f, dur, vol, type = 'sine', f2 = 0, atk = 0.005) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f2 > 0) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(Math.max(vol, 0.0001), t + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, atk + 0.01));
  o.connect(g); g.connect(dest);
  o.start(t); o.stop(t + dur + 0.03);
}

function noise(dest, t, dur, vol, ftype = 'bandpass', f1 = 1000, f2 = 0, q = 1, atk = 0.003) {
  const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = nbuf; s.loop = true;
  fl.type = ftype; fl.Q.value = q;
  fl.frequency.setValueAtTime(f1, t);
  if (f2 > 0) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(Math.max(vol, 0.0001), t + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl); fl.connect(g); g.connect(dest);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.03);
}

// ---------- SFX ----------
// h.T(dt, freq, dur, vol, type, endFreq)  h.N(dt, dur, vol, filterType, f1, f2, q, atk)
const PENT = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.7, 1318.5, 1568, 1760, 2093, 2349.3];
const arp = (h, notes, step, dur, vol, type = 'triangle', t0 = 0) =>
  notes.forEach((f, i) => h.T(t0 + i * step, f, dur, vol, type));
const slap = (h, k = 1) => {
  h.N(0, 0.09, 0.7 * k, 'bandpass', 1900, 700, 0.8);
  h.N(0, 0.025, 0.35 * k, 'highpass', 3500);
  h.T(0, 130, 0.15, 0.8 * k, 'sine', 48);
};
const coin = (h, dt = 0, k = 1) => {
  h.T(dt, 988, 0.07, 0.17 * k, 'square');
  h.T(dt + 0.07, 1319, 0.32, 0.17 * k, 'square');
  h.T(dt + 0.07, 2638, 0.2, 0.04 * k, 'sine');
};

const SFX = {
  button: h => { h.T(0, 880, 0.06, 0.25, 'triangle', 640); h.N(0, 0.02, 0.1, 'highpass', 3000); },
  tap: h => h.T(0, 520, 0.05, 0.22, 'sine', 380),
  whoosh: h => h.N(0, 0.3, 0.4, 'bandpass', 350, 2600, 1.2, 0.12),
  hit: h => slap(h),
  flip: h => { slap(h, 1.1); arp(h, [PENT[2], PENT[3], PENT[5], PENT[7], PENT[8], PENT[10]], 0.06, 0.28, 0.2, 'triangle', 0.08); },
  inner: h => {
    slap(h, 0.9);
    [260, 310, 250, 290].forEach((f, i) => h.T(0.05 + i * 0.07, f, 0.1, 0.22, 'square', f * 0.8));
  },
  miss: h => { h.N(0, 0.12, 0.4, 'lowpass', 500, 200); h.T(0, 90, 0.16, 0.6, 'sine', 55); },
  whiff: h => { h.N(0, 0.25, 0.3, 'bandpass', 3000, 800, 1, 0.08); h.T(0.18, 320, 0.3, 0.35, 'triangle', 110); },
  crit: h => arp(h, [1319, 1760, 2093, 2637, 3136], 0.04, 0.2, 0.2, 'sine'),
  coin: h => coin(h),
  coins: h => [0, 1, 2, 3, 4].forEach(i => coin(h, i * 0.07, 0.8 - i * 0.08)),
  win: h => {
    arp(h, [523.25, 659.25, 783.99, 1046.5], 0.14, 0.2, 0.22, 'square');
    [523.25, 659.25, 783.99, 1046.5].forEach(f => h.T(0.6, f, 0.9, 0.14, 'triangle'));
    h.T(0.6, 261.6, 0.9, 0.3, 'triangle');
  },
  lose: h => {
    h.T(0, 392, 0.32, 0.3, 'triangle');
    h.T(0.32, 329.6, 0.32, 0.3, 'triangle');
    h.T(0.64, 261.6, 0.55, 0.32, 'triangle', 233);
  },
  buy: h => { h.T(0, 660, 0.07, 0.17, 'square'); h.T(0.07, 880, 0.07, 0.17, 'square'); h.T(0.14, 1175, 0.22, 0.17, 'square'); },
  levelup: h => { arp(h, [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568], 0.07, 0.2, 0.22, 'square'); h.T(0.42, 2093, 0.5, 0.12, 'sine'); },
  block: h => {
    h.T(0, 330, 0.08, 0.6, 'triangle', 180);
    h.N(0, 0.03, 0.4, 'bandpass', 1500, 0, 3);
    h.T(0.05, 2400, 0.35, 0.08, 'sine'); h.T(0.07, 3200, 0.3, 0.06, 'sine');
  },
  blockPerfect: h => {
    h.T(0, 440, 0.08, 0.6, 'triangle', 240);
    h.N(0, 0.03, 0.4, 'bandpass', 2200, 0, 3);
    arp(h, [1568, 2093, 2637, 3136], 0.05, 0.4, 0.1, 'sine', 0.05);
  },
  error: h => { h.T(0, 110, 0.18, 0.3, 'sawtooth', 85); h.T(0, 116, 0.18, 0.2, 'square', 90); },
  gacha: h => {
    for (let i = 0; i < 12; i++) {
      h.N(i * 0.06, 0.035, 0.3, 'bandpass', 1200 + (i % 3) * 450, 0, 4);
      h.T(i * 0.06, 200 + i * 25, 0.04, 0.12, 'square');
    }
    h.T(0.76, 140, 0.15, 0.6, 'triangle', 70); h.N(0.76, 0.06, 0.4, 'lowpass', 900);
  },
  reveal: h => arp(h, [PENT[3], PENT[5], PENT[4], PENT[7], PENT[6], PENT[9], PENT[8], PENT[11]], 0.035, 0.3, 0.18, 'sine'),
  rare: h => {
    arp(h, [PENT[2], PENT[3], PENT[5], PENT[7], PENT[8], PENT[10], PENT[11]], 0.07, 0.6, 0.18, 'sine');
    [1046.5, 1318.5, 1568, 2093].forEach(f => h.T(0.5, f, 1.1, 0.12, 'triangle'));
    h.N(0.5, 0.7, 0.12, 'highpass', 6000, 9000, 1, 0.2);
  },
  turn: h => { h.T(0, 784, 0.14, 0.25, 'triangle'); h.T(0.12, 1047, 0.26, 0.25, 'triangle'); },
  tick: h => { h.N(0, 0.015, 0.2, 'highpass', 4000); h.T(0, 1800, 0.02, 0.1, 'square'); },
  daily: h => {
    arp(h, [783.99, 1046.5, 1318.5, 1568], 0.11, 0.7, 0.18, 'sine');
    arp(h, [1568, 2093, 2637, 3136], 0.11, 0.5, 0.05, 'sine');
  },
};

// ---------- charge tone ----------
function chargeParams(p) {
  const t = ctx.currentTime;
  ch.o1.frequency.setTargetAtTime(180 * Math.pow(4, p), t, 0.04);
  ch.o2.frequency.setTargetAtTime(180 * Math.pow(4, p) * 1.005, t, 0.04);
  ch.f.frequency.setTargetAtTime(500 + p * 3500, t, 0.05);
  ch.g.gain.setTargetAtTime(0.1 + 0.12 * p, t, 0.05);
  ch.lfoG.gain.setTargetAtTime(2 + p * 10, t, 0.05);
}

// ---------- music ----------
// 8 tokens per bar (8th notes). '-' = hold, '.' = rest.
// Drums: k kick, s snare, h hat, K/S = kick/snare + hat.
const TRACKS = {
  title: { bpm: 110, wave: 'square', lv: 0.3,
    lead: ['E5 - G5 - A5 - G5 -', 'E5 - D5 - C5 - . .', 'D5 - E5 - G5 - E5 -', 'D5 - C5 - . . . .',
           'A5 - A5 G5 E5 - G5 -', 'A5 - C6 - A5 - G5 -', 'E5 - G5 E5 D5 - C5 -', 'D5 - . . G4 - . .'],
    bass: ['C3 . G3 . C3 . G3 .', 'A2 . E3 . A2 . E3 .', 'G2 . D3 . G2 . D3 .', 'C3 . G3 . G2 . G3 .'],
    drum: ['K.h.S.h.', 'K.h.S.hK'] },
  home: { bpm: 96, wave: 'triangle', lv: 0.55,
    lead: ['G4 - A4 - C5 - A4 -', 'G4 - E4 - D4 - . .', 'E4 - G4 - A4 - G4 -', 'E4 - D4 - C4 - . .',
           'C5 - D5 - E5 - D5 -', 'C5 - A4 - G4 - . .', 'A4 - G4 - E4 - D4 -', 'C4 - - - . . . .'],
    bass: ['C3 - . . G2 - . .', 'A2 - . . E3 - . .', 'G2 - . . D3 - . .', 'C3 - . . G2 - . .'],
    drum: ['k.h.h.h.', 'k.h.s.h.'] },
  battle: { bpm: 132, wave: 'square', lv: 0.3,
    lead: ['A4 A4 C5 A4 D5 A4 E5 A4', 'G4 G4 A4 G4 E4 G4 A4 -', 'A4 A4 C5 A4 D5 A4 E5 G5', 'E5 - D5 - C5 - A4 -',
           'D5 D5 E5 D5 C5 D5 E5 D5', 'C5 C5 D5 C5 A4 C5 D5 -', 'E5 E5 G5 E5 D5 E5 C5 D5', 'E5 - - - A4 - . .'],
    bass: ['A2 A2 A2 A2 A2 A2 C3 C3', 'G2 G2 G2 G2 G2 G2 A2 A2', 'A2 A2 A2 A2 A2 A2 C3 C3', 'E2 E2 E2 E2 E2 E2 G2 G2'],
    drum: ['KhShKhSh', 'KhShKKSh'] },
  boss: { bpm: 144, wave: 'square', lv: 0.3,
    lead: ['A4 A4 C5 A4 Bb4 A4 E5 -', 'D5 D5 F5 D5 E5 D5 C5 -', 'A4 A4 C5 A4 Bb4 A4 E5 F5', 'E5 - D5 - C5 - Bb4 -',
           'A5 - G5 - E5 - F5 E5', 'D5 - E5 - F5 - E5 -', 'C5 C5 D5 E5 F5 E5 D5 C5', 'A4 - - - . . . .'],
    bass: ['A2 A2 A2 A2 A2 A2 Bb2 A2', 'F2 F2 F2 F2 F2 F2 E2 E2', 'A2 A2 A2 A2 A2 A2 Bb2 A2', 'E2 E2 E2 E2 Bb2 Bb2 A2 A2'],
    drum: ['KhShKhSh', 'KKShKhSS'] },
};

const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const midiOf = s => {
  const m = /^([A-G])([b#]?)(\d)$/.exec(s);
  return 12 * (+m[3] + 1) + SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
};
const hz = m => 440 * Math.pow(2, (m - 69) / 12);

function parseLayer(bars) {
  const out = []; let last = null;
  for (const bar of bars) for (const tk of bar.trim().split(/\s+/)) {
    if (tk === '-') { if (last) last.len++; out.push(null); }
    else if (tk === '.') { last = null; out.push(null); }
    else { last = { m: midiOf(tk), len: 1 }; out.push(last); }
  }
  return out;
}

function prepare(def) {
  if (!def.p) def.p = { lead: parseLayer(def.lead), bass: parseLayer(def.bass), drum: def.drum.join('') };
  return def.p;
}

function playStep(s) {
  const { def, p, gain } = s, t = s.next, dt = s.dt;
  const i = s.i % p.lead.length;
  const l = p.lead[i], b = p.bass[i % p.bass.length], d = p.drum[i % p.drum.length];
  if (l) tone(gain, t, hz(l.m), l.len * dt * 0.95, def.lv, def.wave, 0, 0.01);
  if (b) tone(gain, t, hz(b.m), b.len * dt * 0.9, 0.55, 'triangle', 0, 0.01);
  if (d === 'k' || d === 'K') tone(gain, t, 150, 0.12, 0.7, 'sine', 45);
  if (d === 's' || d === 'S') { noise(gain, t, 0.1, 0.3, 'bandpass', 1800, 0, 0.8); tone(gain, t, 200, 0.07, 0.25, 'triangle', 120); }
  if (d === 'h' || d === 'K' || d === 'S') noise(gain, t, 0.035, d === 'h' ? 0.12 : 0.08, 'highpass', 7000);
}

function scheduler() {
  try {
    if (!cur || !ctx) return;
    while (cur.next < ctx.currentTime + AHEAD) {
      playStep(cur);
      cur.next += cur.dt; cur.i++;
    }
  } catch (e) { /* never break the game loop */ }
}

function startSeq(name, fade) {
  const def = TRACKS[name], t = ctx.currentTime;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(1, t + (fade ? XFADE : 0.05));
  gain.connect(musicBus);
  return { name, def, p: prepare(def), gain, i: 0, next: t + 0.06, dt: 60 / def.bpm / 2 };
}

function fadeOut(s, dur) {
  const t = ctx.currentTime;
  s.gain.gain.cancelScheduledValues(t);
  s.gain.gain.setValueAtTime(s.gain.gain.value, t);
  s.gain.gain.linearRampToValueAtTime(0.0001, t + dur);
  setTimeout(() => { try { s.gain.disconnect(); } catch (e) { /* ignore */ } }, dur * 1000 + 150);
}

// Reconcile what is playing with (want, Sound.music).
function syncMusic() {
  if (!ctx) return;
  const name = Sound.music && TRACKS[want] ? want : null;
  if ((cur ? cur.name : null) === name) return;
  const prev = cur; cur = null;
  if (prev) fadeOut(prev, XFADE);
  if (name) cur = startSeq(name, !!prev);
  if (cur && !timer) timer = setInterval(scheduler, TICK);
  if (!cur && timer) { clearInterval(timer); timer = 0; }
}

// ---------- public API ----------
export const Sound = {
  sfx: true,
  music: true,

  unlock() {
    try {
      if (!ensure()) return;
      if (ctx.state !== 'running' && ctx.resume) ctx.resume().catch(() => {});
      if (!ctx._primed) { // iOS: play a silent buffer inside the gesture
        ctx._primed = true;
        const s = ctx.createBufferSource();
        s.buffer = ctx.createBuffer(1, 1, 22050); s.connect(ctx.destination); s.start(0);
      }
      syncMusic();
    } catch (e) { /* ignore */ }
  },

  setSfx(on) { this.sfx = !!on; if (!on) this.stopCharge(); },
  setMusic(on) { this.music = !!on; try { syncMusic(); } catch (e) { /* ignore */ } },

  play(name, opts = {}) {
    try {
      const fn = SFX[name];
      if (!fn || !this.sfx || !ctx || hidden()) return;
      const t = ctx.currentTime + 0.005, p = opts.pitch > 0 ? opts.pitch : 1;
      const v = opts.vol == null ? 1 : clamp(opts.vol, 0, 1.5);
      fn({
        T: (dt, f, dur, vol, type, f2 = 0, atk) => tone(sfxBus, t + dt, f * p, dur, vol * v, type, f2 * p, atk),
        N: (dt, dur, vol, ft, f1, f2, q, atk) => noise(sfxBus, t + dt, dur, vol * v, ft, f1, f2, q, atk),
      });
    } catch (e) { /* ignore */ }
  },

  startCharge() {
    try {
      if (!this.sfx || !ctx || ch) return;
      const t = ctx.currentTime;
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), lfo = ctx.createOscillator();
      const g = ctx.createGain(), f = ctx.createBiquadFilter(), lfoG = ctx.createGain(), g2 = ctx.createGain();
      o1.type = 'triangle'; o2.type = 'square'; g2.gain.value = 0.25;
      f.type = 'lowpass'; f.Q.value = 2;
      lfo.frequency.value = 6; lfo.connect(lfoG); lfoG.connect(o1.frequency); lfoG.connect(o2.frequency);
      g.gain.setValueAtTime(0.0001, t);
      o1.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(sfxBus);
      ch = { o1, o2, lfo, g, f, lfoG };
      chargeParams(0);
      g.gain.setTargetAtTime(0.1, t, 0.03);
      o1.start(t); o2.start(t); lfo.start(t);
    } catch (e) { ch = null; }
  },

  setCharge(p) {
    try { if (ch && ctx) chargeParams(clamp(+p || 0, 0, 1)); } catch (e) { /* ignore */ }
  },

  stopCharge() {
    try {
      if (!ch || !ctx) { ch = null; return; }
      const c = ch, t = ctx.currentTime; ch = null;
      c.g.gain.cancelScheduledValues(t);
      c.g.gain.setTargetAtTime(0.0001, t, 0.03);
      [c.o1, c.o2, c.lfo].forEach(o => o.stop(t + 0.15));
    } catch (e) { ch = null; }
  },

  playMusic(track) {
    try {
      const name = TRACKS[track] ? track : null;
      if (name === want) return;
      want = name;
      syncMusic();
    } catch (e) { /* ignore */ }
  },
};

// Pause while the tab is hidden, resume when it is visible again.
if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('visibilitychange', () => {
    try {
      if (!ctx) return;
      if (document.hidden) {
        if (timer) { clearInterval(timer); timer = 0; }
        if (ctx.suspend) ctx.suspend().catch(() => {});
      } else {
        const go = () => {
          if (cur && Sound.music && want) {
            cur.next = Math.max(cur.next, ctx.currentTime + 0.05);
            if (!timer) timer = setInterval(scheduler, TICK);
          }
        };
        if (ctx.resume) ctx.resume().then(go, go); else go();
      }
    } catch (e) { /* ignore */ }
  });
}
