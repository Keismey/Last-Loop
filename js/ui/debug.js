// Panneau de debug (GDD §17.8) : #debug dans l'adresse, ou 7 touchers sur la version dans le menu.
import { t } from '../core/i18n.js';
import { el } from './modal.js';
import { toast } from './toasts.js';
import { debugWave, debugAssault, debugMilitia, debugBoss, maxIntegrity } from '../sim/combat.js';
import { debugEvent } from '../sim/events.js';
import { createSurvivor, bedsTotal, SKILLS } from '../sim/crew.js';
import { FIRST_NAMES } from '../data/names.js';
import { bus } from '../core/bus.js';

// Ajout d'un survivant pour les tests : rôle (compétence principale) et sexe au choix
let pickRole = 'mec', pickFemale = true;
function addSurvivor(state) {
  if (state.crew.length >= bedsTotal(state)) { toast(t('debug.noBed'), 'warn'); return; }
  const s = createSurvivor(state, pickRole);
  const used = new Set(state.crew.map(x => x.first));
  const pool = FIRST_NAMES.filter((n, i) => (i < 30) === pickFemale && !used.has(n));
  if (pool.length) s.first = pool[Math.floor(Math.random() * pool.length)];
  state.crew.push(s);
  bus.emit('crew:changed');
  toast(t('debug.added', { name: s.first }));
}

let panel = null;
let fpsEl = null;

// api : { loop, getState, onWipe }
export function openDebug(host, api) {
  if (panel) return;
  fpsEl = el('span', { class: 'debug-fps' });
  const speeds = el('div', { class: 'debug-row' });
  [1, 5, 20].forEach(s => {
    const b = el('button', { class: 'chip', text: '×' + s });
    b.addEventListener('click', () => {
      api.loop.setSpeed(s);
      speeds.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c === b));
    });
    if (api.loop.getSpeed() === s) b.classList.add('on');
    speeds.appendChild(b);
  });
  const add = el('button', { class: 'chip', text: t('debug.addRes') });
  add.addEventListener('click', () => {
    const r = api.getState().resources;
    for (const k of Object.keys(r)) r[k] += 1000;
  });
  const reveal = el('button', { class: 'chip', text: t('debug.reveal') });
  reveal.addEventListener('click', () => {
    const st = api.getState();
    for (const b of Object.values(st.world.branches || {})) { b.known = true; b.lastLap = st.route.lap; }
    for (const s of Object.values(st.world.sites || {})) s.lastSeen = { lap: st.route.lap, stock: s.stock, attitude: s.attitude, defense: s.defense };
    toast(t('debug.revealed'));
  });
  const keys = el('button', { class: 'chip', text: t('debug.keys') });
  keys.addEventListener('click', () => { const st = api.getState(); st.resources.keys = Math.min(99, (st.resources.keys || 0) + 3); });
  const wave = el('button', { class: 'chip', text: t('debug.wave'), onclick: () => debugWave(api.getState()) });
  const assault = el('button', { class: 'chip', text: t('debug.assault'), onclick: () => debugAssault(api.getState()) });
  const militia = el('button', { class: 'chip', text: t('debug.militia'), onclick: () => debugMilitia(api.getState()) });
  const evt = el('button', { class: 'chip', text: t('debug.event'), onclick: () => debugEvent(api.getState()) });
  const boss = el('button', { class: 'chip', text: t('debug.boss'), onclick: () => debugBoss(api.getState()) });
  const hurt = el('button', { class: 'chip', text: t('debug.hurt'), onclick: () => { const st = api.getState(); st.train.integrity = Math.max(1, st.train.integrity - 50); } });
  const heal = el('button', { class: 'chip', text: t('debug.heal'), onclick: () => { const st = api.getState(); st.train.integrity = maxIntegrity(st); } });
  let armed = false;
  const wipe = el('button', { class: 'chip chip-danger', text: t('debug.wipe') });
  wipe.addEventListener('click', () => {
    if (!armed) {
      armed = true;
      wipe.textContent = t('debug.wipeConfirm');
      setTimeout(() => { armed = false; wipe.textContent = t('debug.wipe'); }, 3000);
      return;
    }
    api.onWipe();
    toast(t('debug.wiped'));
  });
  // Survivants : rôle, sexe, puis « +1 »
  const roles = el('div', { class: 'debug-row' });
  for (const k of SKILLS) {
    const b = el('button', { class: 'chip' + (k === pickRole ? ' on' : ''), text: t('skill.' + k) });
    b.addEventListener('click', () => { pickRole = k; roles.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c === b)); });
    roles.appendChild(b);
  }
  const sexes = el('div', { class: 'debug-row' });
  [[true, t('debug.female')], [false, t('debug.male')]].forEach(([f, label]) => {
    const b = el('button', { class: 'chip' + (f === pickFemale ? ' on' : ''), text: label });
    b.addEventListener('click', () => { pickFemale = f; sexes.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c === b)); });
    sexes.appendChild(b);
  });
  const plus = el('button', { class: 'chip chip-primary', text: t('debug.addCrew'), onclick: () => addSurvivor(api.getState()) });
  const close = el('button', { class: 'chip', text: t('debug.close'), onclick: closeDebug });
  panel = el('div', { class: 'debug-panel' },
    el('div', { class: 'debug-row' }, el('strong', { text: t('debug.title') }), fpsEl),
    el('div', { class: 'debug-row' }, el('span', { class: 'muted', text: t('debug.speed') }), speeds),
    el('div', { class: 'debug-row' }, add, keys, reveal),
    el('div', { class: 'debug-row' }, wave, assault, militia, boss, evt, hurt, heal),
    el('div', { class: 'debug-row' }, el('span', { class: 'muted', text: t('debug.crew') }), roles, sexes, plus),
    el('div', { class: 'debug-row' }, wipe, close));
  host.appendChild(panel);
}

export function closeDebug() {
  if (panel) panel.remove();
  panel = null;
  fpsEl = null;
}

export function updateDebug(fps) {
  if (fpsEl) fpsEl.textContent = t('debug.fps', { fps });
}
