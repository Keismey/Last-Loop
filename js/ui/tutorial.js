// Tutoriel guidé (GDD §12), qui sert d'introduction : Gus parle dans une bulle, le jeu éclaire l'élément à toucher
// et bloque tout le reste. Court : les grandes lignes, le joueur découvre le reste.
// Ensuite, les conseils de Gus (une fois chacun, désactivables dans les Options).
import { t } from '../core/i18n.js';
import { settings } from '../core/settings.js';
import { getImage } from '../render/assets.js';

// target : élément éclairé ; on : 'click' (toucher la cible, ou sel dedans) ; next : bouton « Suivant »
// wait : le jeu tourne librement jusqu'à ce que la condition soit vraie
const STEPS = [
  { id: 'hello', next: true, face: 1 },
  { id: 'world', next: true, face: 2 },
  { id: 'crew', target: '.chip-auto', on: 'click' },
  { id: 'posts', target: '#scene', next: true },
  { id: 'res', target: '#hud-res', on: 'click' },
  { id: 'balance', target: '.side-panel', next: true },
  { id: 'close', target: '.side-panel .panel-head .icon-btn:not(.panel-back)', on: 'click' },
  { id: 'switch', target: '.switchboard .sb-cards', on: 'click', sel: '.sb-card:not(.locked)' },
  { id: 'depart', target: '.btn-depart', on: 'click', face: 1 },
  { id: 'ride', wait: api => api.choiceOpen() },
  { id: 'stop', target: '.switchboard .sb-actions', on: 'click', sel: '.sb-action' },
  { id: 'tabs', target: '#tabs', next: true },
  { id: 'bye', next: true, face: 2 }
];
// Conseils : visage selon le ton
const TIP_FACE = { boss: 2, critical: 2, hunt: 2, grudge: 2, broken: 2, wave: 2, research: 1, camp: 1 };

// Portrait de Gus (image Gemini) ou visage provisoire
function faceHtml(i) {
  const img = getImage('gus_' + (i || 0));
  return img ? `<img src="${img.src}" alt="">` : GUS_SVG;
}

let ui = null;       // { root, spot, panes[4], bubble, text, nextBtn, skipBtn }
let api = null;      // { getState, setPause(on), choiceOpen(), onDone() }
let raf = 0;
let missing = 0;     // temps sans cible (s) : l'étape est sautée si l'élément n'existe pas

const tuto = () => api && api.getState() && api.getState().tuto;
export const tutoActive = () => !!(tuto() && !tuto().done);

// Visage provisoire de Gus (casquette rayée, moustache blanche), remplacé par l'image Gemini quand elle existe
const GUS_SVG = `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="34" r="22" fill="#e9b48f" stroke="#2B2A33" stroke-width="2.5"/>
<path d="M10 26 Q32 4 54 26 Z" fill="#c9c4bd" stroke="#2B2A33" stroke-width="2.5"/><path d="M16 19 h32 M13 23 h38" stroke="#7d8790" stroke-width="2.5"/>
<rect x="8" y="25" width="48" height="5" rx="2" fill="#5a5157" stroke="#2B2A33" stroke-width="2"/>
<circle cx="24" cy="35" r="2.6" fill="#2B2A33"/><circle cx="40" cy="35" r="2.6" fill="#2B2A33"/><circle cx="32" cy="41" r="4" fill="#d9826a"/>
<path d="M16 47 Q24 40 32 45 Q40 40 48 47 Q40 51 32 48 Q24 51 16 47 Z" fill="#f2efe8" stroke="#2B2A33" stroke-width="2"/></svg>`;

function build() {
  const root = document.createElement('div');
  root.className = 'tuto';
  const spot = document.createElement('div');
  spot.className = 'tuto-spot';
  const panes = [0, 1, 2, 3].map(() => { const p = document.createElement('div'); p.className = 'tuto-pane'; return p; });
  const bubble = document.createElement('div');
  bubble.className = 'tuto-bubble';
  bubble.setAttribute('role', 'dialog');
  const face = document.createElement('div');
  face.className = 'tuto-face';
  face.innerHTML = faceHtml(0);
  const col = document.createElement('div');
  col.className = 'tuto-col';
  const name = document.createElement('strong');
  name.textContent = 'Gus';
  const text = document.createElement('p');
  const row = document.createElement('div');
  row.className = 'tuto-row';
  const skipBtn = document.createElement('button');
  skipBtn.type = 'button'; skipBtn.className = 'btn btn-ghost btn-small'; skipBtn.textContent = t('tuto.skip');
  const nextBtn = document.createElement('button');
  nextBtn.type = 'button'; nextBtn.className = 'btn btn-primary btn-small'; nextBtn.textContent = t('tuto.next');
  row.append(skipBtn, nextBtn);
  col.append(name, text, row);
  bubble.append(face, col);
  root.append(spot, ...panes, bubble);
  document.getElementById('app').appendChild(root);
  nextBtn.addEventListener('click', () => advance());
  skipBtn.addEventListener('click', () => finish());
  return { root, spot, panes, bubble, text, nextBtn, skipBtn, face };
}

// Toucher la cible fait avancer (l'action du jeu a lieu normalement, l'étape suit)
function onClickCapture(e) {
  const st = tuto();
  if (!st || st.done) return;
  const step = STEPS[st.step];
  if (!step || step.on !== 'click') return;
  const tg = document.querySelector(step.target);
  if (!tg) return;
  const hit = step.sel ? e.target.closest(step.sel) : e.target.closest(step.target);
  if (hit && tg.contains(hit)) setTimeout(() => advance(), 60);
}

export function startTutorial(a) {
  api = a;
  if (!tutoActive()) return;
  if (!ui) {
    ui = build();
    document.addEventListener('click', onClickCapture, true);
  }
  show();
  if (!raf) raf = requestAnimationFrame(tick);
}

function advance() {
  const st = tuto();
  if (!st) return;
  st.step += 1;
  missing = 0;
  if (st.step >= STEPS.length) { finish(); return; }
  show();
}

function finish() {
  const st = tuto();
  if (st) st.done = true;
  if (ui) { ui.root.remove(); ui = null; }
  document.removeEventListener('click', onClickCapture, true);
  cancelAnimationFrame(raf); raf = 0;
  api.setPause(false);
  api.onDone && api.onDone();
}

function show() {
  const st = tuto();
  const step = STEPS[st.step];
  const waiting = !!step.wait;
  ui.root.classList.toggle('free', waiting);
  api.setPause(!waiting);
  ui.text.textContent = waiting ? '' : t('tuto.' + step.id);
  ui.face.innerHTML = faceHtml(step.face);
  ui.nextBtn.hidden = !step.next;
  ui.nextBtn.textContent = st.step === STEPS.length - 1 ? t('tuto.go') : t('tuto.next');
  ui.skipBtn.hidden = st.step === STEPS.length - 1;
  place();
}

// Spot et panneaux bloquants autour de la cible (ou tout l'écran s'il n'y a rien à toucher)
function place(dt = 0) {
  const st = tuto();
  if (!ui || !st) return;
  const step = STEPS[st.step];
  if (step.wait) {
    if (step.wait(api)) advance();
    return;
  }
  const W = innerWidth, H = innerHeight;
  let r = null;
  if (step.target) {
    const tg = document.querySelector(step.target);
    if (tg && tg.offsetParent !== null) {
      const b = tg.getBoundingClientRect();
      if (b.width > 2 && b.height > 2) r = { x: b.left - 6, y: b.top - 6, w: b.width + 12, h: b.height + 12 };
    }
    if (!r) {
      missing += dt;
      if (missing > 2.5) { advance(); return; }    // élément absent (cas imprévu) : on ne bloque jamais le joueur
    } else missing = 0;
  }
  const clickThrough = step.on === 'click' && r;
  const s = ui.spot.style;
  if (r) {
    ui.spot.hidden = false;
    s.left = r.x + 'px'; s.top = r.y + 'px'; s.width = r.w + 'px'; s.height = r.h + 'px';
  } else {
    ui.spot.hidden = false;
    s.left = W / 2 + 'px'; s.top = H / 2 + 'px'; s.width = '0px'; s.height = '0px';
  }
  ui.spot.classList.toggle('pulse', !!clickThrough);
  // Quatre panneaux autour du trou : seule la cible reste touchable (et rien si on attend « Suivant »)
  const hole = clickThrough ? r : { x: W / 2, y: H / 2, w: 0, h: 0 };
  const rects = [
    [0, 0, W, Math.max(0, hole.y)],
    [0, hole.y + hole.h, W, Math.max(0, H - hole.y - hole.h)],
    [0, hole.y, Math.max(0, hole.x), hole.h],
    [hole.x + hole.w, hole.y, Math.max(0, W - hole.x - hole.w), hole.h]
  ];
  ui.panes.forEach((p, i) => {
    const [x, y, w, h] = rects[i];
    Object.assign(p.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
  });
  // Bulle : en bas, sauf si la cible y est
  const low = r && r.y + r.h / 2 > H * 0.5;
  ui.bubble.classList.toggle('top', !!low);
  // Bulle à gauche quand un panneau latéral occupe la droite
  ui.bubble.classList.toggle('left', !!document.querySelector('.side-panel'));
}

let lastT = 0;
function tick(now) {
  const dt = lastT ? Math.min(0.1, (now - lastT) / 1000) : 0;
  lastT = now;
  if (!tutoActive()) { raf = 0; return; }
  place(dt);
  raf = requestAnimationFrame(tick);
}

// ---------- Conseils de Gus : une fois chacun, la première fois que la situation se présente ----------
let tipEl = null, tipTimer = 0;
export function gusTip(state, key) {
  if (!settings.tips || !state || tutoActive()) return;
  state.tipsSeen = state.tipsSeen || {};
  if (state.tipsSeen[key]) return;
  state.tipsSeen[key] = 1;
  if (tipEl) tipEl.remove();
  tipEl = document.createElement('button');
  tipEl.type = 'button';
  tipEl.className = 'gus-tip';
  tipEl.innerHTML = `<span class="tuto-face">${faceHtml(TIP_FACE[key])}</span><span class="tip-text"><strong>Gus</strong></span>`;
  const p = document.createElement('span');
  p.textContent = t('tip.' + key);
  tipEl.querySelector('.tip-text').appendChild(p);
  const el = tipEl;
  el.addEventListener('click', () => el.remove());
  document.getElementById('scene-overlay').appendChild(el);
  clearTimeout(tipTimer);
  tipTimer = setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 9000);
}
