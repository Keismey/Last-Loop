// Musiques : une piste à la fois, fondu enchaîné quand l'ambiance change (titre, route, combat, halte).
// Chaque piste boucle sans coupure : deux lecteurs se relaient, avec un fondu de LOOP_FADE secondes à la fin.
// Les pistes absentes sont ignorées (repli : la musique de route de la zone 1).
import { MUSIC, AVAILABLE_MUSIC } from '../data/assets.js';
import { settings } from '../core/settings.js';
import { audioContext } from './sound.js';

const SWITCH_FADE = 1.6;   // s : changement d'ambiance
const LOOP_FADE = 4;       // s : raccord de boucle
const TICK = 0.1;

const tracks = new Map();  // id → { players: [Audio, Audio], active: 0, level: 0, xf: null }
let current = null;
let unlocked = false;
let muted = false;
let timer = null;

const srcOf = id => (MUSIC.find(m => m.id === id) || {}).src;
const has = id => AVAILABLE_MUSIC.has(id);

function track(id) {
  if (!tracks.has(id)) {
    const mk = () => {
      const a = new Audio(srcOf(id));
      a.preload = 'auto';
      // Volume par Web Audio (iPhone ignore le volume des balises audio)
      const ctx = audioContext();
      if (ctx) {
        try { const g = ctx.createGain(); g.gain.value = 0; ctx.createMediaElementSource(a).connect(g); g.connect(ctx.destination); a._g = g; }
        catch (e) { a.volume = 0; }
      } else a.volume = 0;
      return a;
    };
    tracks.set(id, { players: [mk(), mk()], active: 0, level: 0, xf: null });
  }
  return tracks.get(id);
}

const master = () => (muted ? 0 : settings.music * 0.7);

function play(a) { if (a.paused && !muted) a.play().catch(() => {}); }
function setVol(a, v) { if (a._g) a._g.gain.value = v; else a.volume = v; }

function tick() {
  if (muted) { for (const tr of tracks.values()) for (const p of tr.players) if (!p.paused) p.pause(); return; }
  let busy = false;
  for (const [id, tr] of tracks) {
    const want = id === current ? 1 : 0;
    const step = TICK / SWITCH_FADE;
    tr.level = want > tr.level ? Math.min(want, tr.level + step) : Math.max(want, tr.level - step);
    const a = tr.players[tr.active], b = tr.players[1 - tr.active];
    // Raccord de boucle : le second lecteur repart du début pendant que le premier s'éteint
    if (tr.level > 0 && tr.xf === null && a.duration && a.currentTime > a.duration - LOOP_FADE) {
      tr.xf = 0;
      b.currentTime = 0;
      play(b);
    }
    let va = 1, vb = 0;
    if (tr.xf !== null) {
      tr.xf = Math.min(1, tr.xf + TICK / LOOP_FADE);
      va = 1 - tr.xf; vb = tr.xf;
      if (tr.xf >= 1) { a.pause(); tr.active = 1 - tr.active; tr.xf = null; va = 0; vb = 1; }
    }
    const m = master() * tr.level;
    const cur = tr.players[tr.active], other = tr.players[1 - tr.active];
    if (tr.xf === null) { setVol(cur, clamp(m)); if (!other.paused) other.pause(); }
    else { setVol(a, clamp(m * va)); setVol(b, clamp(m * vb)); }
    if (tr.level <= 0) { for (const p of tr.players) if (!p.paused) p.pause(); tr.xf = null; }
    else busy = true;
  }
  if (!busy && !current) { clearInterval(timer); timer = null; }
}
const clamp = v => Math.max(0, Math.min(1, v));

function ensureTimer() { if (!timer) timer = setInterval(tick, TICK * 1000); }

export function unlockMusic() {
  unlocked = true;
  if (current) start(current);
}

function start(id) {
  const tr = track(id);
  play(tr.players[tr.active]);
  ensureTimer();
}

// Choisit la piste ; les replis évitent le silence quand une piste n'existe pas encore
export function playMusic(id) {
  const pick = [id, id && id.startsWith('mus_c') ? 'mus_c1' : null, id === 'mus_boss' ? 'mus_combat' : null].find(x => x && has(x)) || null;
  if (pick === current) return;
  current = pick;
  if (!unlocked) return;
  if (pick) start(pick);
  else ensureTimer();
}

export function muteMusic(on) {
  muted = on;
  if (!unlocked) return;
  if (on) { tick(); return; }
  if (current) start(current);
  ensureTimer();
}

