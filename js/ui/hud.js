// Barre du haut et rail d'onglets (GDD §14.2).
import { icon } from './icons.js';
import { t, num, dec, duration } from '../core/i18n.js';
import { capacities } from '../core/state.js';
import { currentBranch, sitePos, junctionPos } from '../sim/route.js';
import { maxIntegrity, steamActive } from '../sim/combat.js';
import { eventSpeed } from '../sim/events.js';
import { COMBAT } from '../data/enemies.js';
import { isHalte } from '../sim/route.js';
import { economyFlows } from '../sim/energy.js';
import { huntLevel } from '../sim/zones.js';
import { zoneOf } from '../data/zones.js';
import { PROGRESS } from '../data/balance.js';
import { toast } from './toasts.js';

const RES = ['fuel', 'food', 'scrap', 'ammo', 'parts', 'know', 'keys'];
// Seules les ressources consommées en continu passent en rouge (un Savoir à 0 n'est pas une alerte)
const LOW_ALERT = ['fuel', 'food', 'ammo'];
// Pénurie annoncée : la ressource clignote en rouge quand elle sera épuisée dans moins de SHORT_SEC (temps réel)
const SHORT_RES = ['fuel', 'food', 'scrap'];
const SHORT_SEC = 60;
let shortT = 0, shortage = {}, warned = {}, gameSpeed = 1;
// Vitesse du jeu (×1, ×2) : les délais affichés sont en temps réel
export const setHudSpeed = v => { gameSpeed = v || 1; };
const TABS = [['train', null], ['crew', null], ['research', null], ['log', null], ['map', null]];
let refs = {};
let lastText = '';

export function initHud({ resBox, routeEl, timeEl, tabsBox, menuBtn, onMenu, powerEl, onTab, progressEl, integrityEl, huntEl, onRes, badges }) {
  resBox.innerHTML = '';
  // Toucher les ressources : bilan production − consommation
  if (onRes && !resBox.dataset.bound) { resBox.dataset.bound = '1'; resBox.addEventListener('click', () => onRes()); }
  resBox.title = t('balance.title');
  refs = { values: {}, items: {}, routeEl, timeEl, powerEl, progressEl, progKey: '', integrityEl, huntEl, huntKey: '', tabsBox, badges };
  shortage = {}; warned = {};
  if (huntEl && !huntEl.dataset.bound) {
    huntEl.dataset.bound = '1';
    huntEl.addEventListener('click', () => toast(huntEl.title));
  }
  if (integrityEl) {
    integrityEl.innerHTML = `${icon('shield')}<span class="int-bar"><b></b></span><span class="num int-val"></span>`;
    integrityEl.title = t('hud.integrity');
  }
  for (const r of RES) {
    const item = document.createElement('div');
    item.className = 'res';
    item.title = t('res.' + r);
    item.innerHTML = `${icon(r, t('res.' + r))}<span class="res-val">0</span>`;
    resBox.appendChild(item);
    refs.items[r] = item;
    refs.values[r] = item.querySelector('.res-val');
  }
  tabsBox.innerHTML = '';
  for (const [tab, milestone] of TABS) {
    const b = document.createElement('button');
    b.className = 'tab';
    b.type = 'button';
    b.dataset.tab = tab;
    b.disabled = !!milestone;
    b.innerHTML = `${icon(tab)}<span>${t('tabs.' + tab)}</span>`;
    if (milestone) b.title = t('tabs.soon', { m: milestone });
    else b.addEventListener('click', () => onTab && onTab(tab));
    tabsBox.appendChild(b);
  }
  menuBtn.innerHTML = icon('menu');
  menuBtn.setAttribute('aria-label', t('hud.menu'));
  menuBtn.addEventListener('click', onMenu);
}

// Barre de progression de l'embranchement (en haut de la scène), avec un repère par arrêt
function updateProgress(state, b) {
  const el = refs.progressEl;
  if (!el) return;
  const r = state.route;
  if (r.mode === 'depot' || !b) { el.hidden = true; return; }
  el.hidden = false;
  const key = r.leg + '|' + b.id;
  const total = junctionPos(state) - r.legStart;
  if (refs.progKey !== key) {
    refs.progKey = key;
    el.innerHTML = '<b></b>';
    b.sites.forEach((s, k) => {
      const m = document.createElement('i');
      m.style.left = ((sitePos(state, k) - r.legStart) / total) * 100 + '%';
      el.appendChild(m);
    });
  }
  el.querySelector('b').style.width = Math.max(0, Math.min(100, ((r.distance - r.legStart) / total) * 100)) + '%';
  el.querySelectorAll('i').forEach((m, k) => m.classList.toggle('done', k < r.stopIdx));
}

export function updateHud(state) {
  const caps = capacities(state);
  // Rail d'onglets : le Train s'allume quand on peut y toucher (Halte) ; pastilles (objectifs à récupérer…)
  if (refs.tabsBox) {
    const tr = refs.tabsBox.querySelector('[data-tab="train"]');
    if (tr) tr.classList.toggle('ready', isHalte(state));
    if (refs.badges) for (const [tab, fn] of Object.entries(refs.badges)) {
      const b = refs.tabsBox.querySelector(`[data-tab="${tab}"]`);
      if (!b) continue;
      const n = fn(state);
      let badge = b.querySelector('.tab-badge');
      if (!n) { if (badge) badge.remove(); continue; }
      if (!badge) { badge = document.createElement('b'); badge.className = 'tab-badge'; b.appendChild(badge); }
      badge.textContent = String(n);
    }
  }
  updateShortage(state);
  for (const r of RES) {
    const v = state.resources[r] || 0;
    refs.values[r].textContent = num(v);
    const item = refs.items[r];
    const ratio = v / caps[r];
    item.classList.toggle('low', LOW_ALERT.includes(r) && ratio < 0.15);
    item.classList.toggle('full', ratio >= 1);
    const sh = shortage[r];
    item.classList.toggle('short', sh !== undefined);
    item.title = sh !== undefined ? t('hud.shortTip', { res: t('res.' + r), t: shortText(sh) }) : t('res.' + r);
  }
  updateHunt(state);
  const r = state.route;
  const b = currentBranch(state);
  let route;
  if (r.mode === 'depot') route = t('hud.routeDepot', { ring: r.ring, lap: r.lap });
  else if (b && b.sites.length) {
    const stop = Math.min(b.sites.length, r.stopIdx + (r.mode === 'stop' ? 1 : 1));
    route = t('hud.routeStop', { ring: r.ring, lap: r.lap, leg: r.leg + 1, legs: r.legs, stop, stops: b.sites.length });
  } else route = t('hud.route', { ring: r.ring, lap: r.lap, leg: r.leg + 1, legs: r.legs });
  updateProgress(state, b);
  if (route !== lastText) {
    refs.routeEl.textContent = route;
    lastText = route;
  }
  refs.timeEl.innerHTML = `${icon('clock')}<span>${duration(state.stats.playTime)}</span>`;
  // Énergie produite / demandée et vitesse du train
  if (refs.powerEl && state.power) {
    const p = state.power;
    const f1 = v => dec(v);
    // Vitesse réelle du train : énergie × pleine vapeur × effets d'événement (tempête, voie, surchauffe)
    const steam = steamActive(state) ? COMBAT.abilities.fullsteam.speed : 1;
    const ev = eventSpeed(state);
    const fx = (state.events && state.events.fx || []).map(f =>
      `<span class="pw-fx ${f.speed < 1 ? 'down' : 'up'}">${t('fx.' + f.id, { s: Math.ceil(f.left) })}</span>`).join('');
    refs.powerEl.innerHTML = `${icon('bolt')}<span class="num">${t('power.short', { p: f1(p.produced), d: f1(p.demand) })}</span>` +
      `<span class="pw-speed${ev < 1 ? ' down' : ev > 1 || steam > 1 ? ' up' : ''}">${t('power.speed', { v: Math.round(p.factor * steam * ev * 100) })}</span>` + fx;
    refs.powerEl.classList.toggle('low', p.ratio < 1);
    refs.powerEl.title = t('power.tip');
  }
  refs.timeEl.title = t('hud.playTime');
  // Intégrité du convoi (GDD §4.5)
  const ie = refs.integrityEl;
  if (ie && typeof state.train.integrity === 'number') {
    const max = maxIntegrity(state), v = Math.max(0, state.train.integrity);
    ie.querySelector('b').style.width = Math.min(100, (v / max) * 100) + '%';
    ie.querySelector('.int-val').textContent = Math.ceil(v);
    ie.classList.toggle('low', v < max * COMBAT.lowIntegrity);
    ie.title = t('hud.integrityTip', { v: Math.ceil(v), max });
  }
}

const lowerFirst = x => x ? x[0].toLowerCase() + x.slice(1) : x;

// ---------- Pénurie annoncée ----------
const shortText = sec => sec < 60 ? t('hud.shortSec', { n: Math.max(5, Math.round(sec / 5) * 5) }) : t('hud.shortMin', { n: Math.round(sec / 60) });

function updateShortage(state) {
  const now = performance.now();
  if (now - shortT < 1000) return;
  shortT = now;
  const running = state.route.mode === 'run';
  const keep = state.power;
  const flows = economyFlows(state, running);
  state.power = keep;
  shortage = {};
  for (const r of SHORT_RES) {
    const net = flows.filter(f => f.res === r).reduce((a, f) => a + f.v, 0);
    const v = state.resources[r] || 0;
    if (net >= -1e-4) { warned[r] = false; continue; }
    const sec = v / -net / gameSpeed;
    if (sec > SHORT_SEC) { if (sec > SHORT_SEC * 1.5) warned[r] = false; continue; }
    shortage[r] = sec;
    // Un seul avertissement par épisode de pénurie
    if (!warned[r] && v > 0.5) { warned[r] = true; toast(t('hud.shortToast', { res: t('res.' + r), t: shortText(sec) }), 'warn'); }
  }
}

// ---------- Traque (la menace monte tant que le boss de la zone vit) ----------
function updateHunt(state) {
  const el = refs.huntEl;
  if (!el) return;
  const lvl = huntLevel(state);
  const key = String(lvl);
  if (key === refs.huntKey) return;
  refs.huntKey = key;
  el.hidden = lvl <= 0;
  if (lvl <= 0) return;
  el.innerHTML = `${icon('skull')}<span class="num">${lvl}</span>`;
  el.classList.toggle('high', lvl >= PROGRESS.huntMax / 2);
  el.title = t('hud.huntTip', { n: lvl, p: Math.round(PROGRESS.huntStep * lvl * 100), boss: lowerFirst(t('boss.' + zoneOf(state.route.ring).boss)) });
  el.setAttribute('aria-label', el.title);
}
