// Bruitages synthétisés par le code (aucun fichier) : Web Audio, débloqué au premier toucher.
// Trois bus : effets, ambiance (roulement du train), musique (voir music.js). Volumes : Options.
import { settings, onSettings } from '../core/settings.js';

let ctx = null;
let sfxBus, ambBus, noiseBuf;
let rumble = null;          // roulement continu (bruit grave filtré)
let clackAt = 0;            // prochain coup de rail (horloge audio)
const last = {};            // anti-rafale par son

export const audioContext = () => ctx;

export function initAudio() {
  if (ctx) { ctx.resume().catch(() => {}); return ctx; }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    ctx.resume().catch(() => {});
  } catch (e) { ctx = null; return null; }
  sfxBus = ctx.createGain();
  ambBus = ctx.createGain();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 4;
  sfxBus.connect(comp); ambBus.connect(comp); comp.connect(ctx.destination);
  // Bruit blanc commun (2 s)
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  applyVolumes();
  onSettings(applyVolumes);
  return ctx;
}

function applyVolumes() {
  if (!ctx) return;
  sfxBus.gain.value = settings.sfx * 0.9;
  ambBus.gain.value = settings.sfx * 0.55;
}

// ---------- Briques ----------
function gate(name, ms) {
  const now = performance.now();
  if (last[name] && now - last[name] < ms) return false;
  last[name] = now;
  return true;
}

function noise(t, dur, { type = 'bandpass', f = 1000, f1 = null, q = 1, gain = 0.5, attack = 0.002, dest = sfxBus } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.playbackRate.value = 0.8 + Math.random() * 0.4;
  const flt = ctx.createBiquadFilter();
  flt.type = type; flt.frequency.setValueAtTime(f, t); flt.Q.value = q;
  if (f1) flt.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(flt); flt.connect(g); g.connect(dest);
  src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.05);
}

function tone(t, dur, { type = 'sine', f = 440, f1 = null, gain = 0.3, attack = 0.005, dest = sfxBus, vib = 0 } = {}) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  if (vib) {
    const l = ctx.createOscillator(), lg = ctx.createGain();
    l.frequency.value = 6; lg.gain.value = vib;
    l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.05);
  }
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest);
  o.start(t); o.stop(t + dur + 0.05);
}

// ---------- Catalogue ----------
const SOUNDS = {
  click: [60, t => tone(t, 0.05, { type: 'triangle', f: 900, f1: 600, gain: 0.12 })],
  // Tourelle : rafale sèche
  turret: [140, t => { noise(t, 0.09, { f: 1800, q: 0.8, gain: 0.35 }); tone(t, 0.08, { type: 'square', f: 140, f1: 60, gain: 0.12 }); }],
  gun: [180, t => { noise(t, 0.12, { f: 2400, q: 0.7, gain: 0.3 }); tone(t, 0.1, { type: 'triangle', f: 220, f1: 70, gain: 0.15 }); }],
  melee: [260, t => { noise(t, 0.08, { type: 'highpass', f: 2500, gain: 0.18 }); tone(t + 0.02, 0.12, { type: 'triangle', f: 160, f1: 90, gain: 0.25 }); }],
  // Coup encaissé par le train : choc métallique
  hit: [320, t => { tone(t, 0.25, { type: 'square', f: 95, f1: 55, gain: 0.18 }); noise(t, 0.18, { f: 700, q: 3, gain: 0.3 }); tone(t, 0.3, { type: 'sine', f: 1250, gain: 0.05 }); }],
  kill: [90, t => { noise(t, 0.35, { type: 'lowpass', f: 1200, f1: 200, gain: 0.45 }); tone(t, 0.3, { type: 'sine', f: 120, f1: 40, gain: 0.35 }); }],
  breach: [500, t => { noise(t, 0.6, { type: 'lowpass', f: 900, f1: 120, gain: 0.6 }); tone(t, 0.5, { type: 'square', f: 70, f1: 35, gain: 0.25 }); tone(t + 0.05, 0.6, { type: 'sine', f: 980, gain: 0.08 }); }],
  derail: [800, t => { for (let i = 0; i < 5; i++) noise(t + i * 0.12, 0.5, { type: 'lowpass', f: 1400 - i * 200, f1: 100, gain: 0.55 }); tone(t, 1.2, { type: 'sawtooth', f: 90, f1: 30, gain: 0.2 }); }],
  // Sifflet de locomotive : deux tuyaux légèrement désaccordés
  whistle: [1500, t => { tone(t, 1.0, { type: 'triangle', f: 587, gain: 0.16, attack: 0.08, vib: 3 }); tone(t, 1.0, { type: 'triangle', f: 740, gain: 0.12, attack: 0.08, vib: 3 }); noise(t, 1.0, { f: 2600, q: 1.5, gain: 0.06, attack: 0.08 }); }],
  brake: [1500, t => { noise(t, 1.1, { f: 3200, f1: 1800, q: 6, gain: 0.12, attack: 0.1 }); }],
  build: [200, t => { [0, 0.16, 0.32].forEach((d, i) => { tone(t + d, 0.12, { type: 'square', f: 300 - i * 20, f1: 150, gain: 0.12 }); noise(t + d, 0.06, { f: 3000, q: 2, gain: 0.2 }); }); }],
  coin: [80, t => { tone(t, 0.09, { type: 'triangle', f: 1320, gain: 0.15 }); tone(t + 0.07, 0.16, { type: 'triangle', f: 1760, gain: 0.15 }); }],
  harvest: [120, t => { tone(t, 0.12, { type: 'triangle', f: 520, f1: 780, gain: 0.14 }); noise(t, 0.1, { type: 'highpass', f: 4000, gain: 0.06 }); }],
  alert: [1200, t => { tone(t, 0.18, { type: 'square', f: 660, gain: 0.1 }); tone(t + 0.22, 0.18, { type: 'square', f: 494, gain: 0.1 }); }],
  success: [300, t => { [523, 659, 784, 1047].forEach((f, i) => tone(t + i * 0.08, 0.22, { type: 'triangle', f, gain: 0.13 })); }],
  levelup: [300, t => { [392, 523, 659].forEach((f, i) => tone(t + i * 0.1, 0.25, { type: 'triangle', f, gain: 0.12 })); }],
  error: [250, t => { tone(t, 0.15, { type: 'square', f: 180, f1: 140, gain: 0.08 }); }],
  heal: [300, t => { tone(t, 0.3, { type: 'sine', f: 440, f1: 660, gain: 0.12 }); }],
  death: [1000, t => { [392, 330, 262].forEach((f, i) => tone(t + i * 0.25, 0.5, { type: 'triangle', f, gain: 0.12 })); }],
  page: [120, t => { noise(t, 0.14, { type: 'bandpass', f: 2500, f1: 1200, q: 0.7, gain: 0.12, attack: 0.02 }); }]
};

export function sfx(name) {
  if (!ctx || ctx.state !== 'running' || settings.sfx <= 0) return;
  const s = SOUNDS[name];
  if (!s || !gate(name, s[0])) return;
  try { s[1](ctx.currentTime + 0.01); } catch (e) { /* son raté : sans conséquence */ }
}

// ---------- Ambiance : roulement et coups de rail, au rythme du train ----------
// speed : vitesse réelle à l'écran (facteur d'énergie × vitesse du jeu), 0 à l'arrêt
export function trainAmbience(speed) {
  if (!ctx || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  if (!rumble) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf; src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 160;
    const g = ctx.createGain(); g.gain.value = 0;
    src.connect(lp); lp.connect(g); g.connect(ambBus);
    src.start();
    rumble = { g, lp };
  }
  const on = speed > 0.05;
  rumble.g.gain.setTargetAtTime(on ? 0.18 + 0.12 * Math.min(2, speed) : 0, now, 0.4);
  rumble.lp.frequency.setTargetAtTime(110 + 60 * Math.min(2, speed), now, 0.4);
  if (!on) { clackAt = 0; return; }
  // Deux coups (essieux avant, arrière) à chaque joint de rail
  const period = 0.75 / Math.max(0.3, speed);
  if (clackAt < now) clackAt = now + 0.05;
  while (clackAt < now + 0.35) {
    noise(clackAt, 0.07, { f: 1700, q: 2, gain: 0.16, dest: ambBus });
    tone(clackAt, 0.08, { type: 'triangle', f: 90, f1: 60, gain: 0.12, dest: ambBus });
    noise(clackAt + 0.14 / Math.max(0.6, speed), 0.07, { f: 1500, q: 2, gain: 0.13, dest: ambBus });
    clackAt += period;
  }
}

// Tout se tait (menu, onglet caché)
export function suspendAudio(on) {
  if (!ctx) return;
  if (on) ctx.suspend().catch(() => {});
  else ctx.resume().catch(() => {});
}
