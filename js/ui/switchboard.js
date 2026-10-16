// Pupitre d'aiguillage (GDD §14.5) : levier et cartes d'embranchement, panneau d'arrêt, dépôt.
import { t, pct as pct_ } from '../core/i18n.js';
import { el } from './modal.js';
import { icon } from './icons.js';
import { fxOn } from '../sim/research.js';
import { toast, buzz } from './toasts.js';
import { BALANCE } from '../data/balance.js';
import { ACTIONS, ROUTE, CAMP_TYPES, SITE_TYPES } from '../data/sites.js';
import {
  nextLeg, nextLegIndex, currentBranch, upcomingSite, secondsToJunction, trainSpeed,
  setChoice, unlockBranch, setPlan, actionsFor, defaultAction, previewGain, leaveStop, departDepot, isHarvestSite,
  decisionContext
} from '../sim/route.js';
import { fleeAssault, fleeRaid, depotOffer, depotBuy, campForce } from '../sim/combat.js';
import { attitudeOf, raidPreview, tributeCost, campState } from '../sim/camp.js';
import { CAMP, ATTITUDE_COLORS } from '../data/sites.js';
import { depotVisit } from '../sim/station.js';
import { BOSSES, COMBAT } from '../data/enemies.js';

let refs = null;
let lastKey = '';
let armedUnlock = null;

export function initSwitchboard(box, { getState, onSummary, onStation, onRecruit }) {
  refs = { box, getState, onSummary, onStation, onRecruit, dyn: {} };
  box.innerHTML = '';
  lastKey = '';
}

const stopContext = decisionContext;

function keyFor(state) {
  const r = state.route;
  const sc = stopContext(state);
  if (r.mode === 'depot') {
    const res = state.resources;
    return `depot|${r.lap}|${r.nextChoice}|${armedUnlock}|${res.keys}|${Math.round(state.train.integrity)}|${Math.floor(res.scrap)}|${Math.floor(res.ammo)}|${state.crew.length}|${depotVisit(state).hired}`;
  }
  const won = state.combat && state.combat.assault ? state.combat.assault.won : '';
  const raidWon = state.combat && state.combat.raid ? state.combat.raid.won : '';
  const att = sc && sc.site.type === 'camp' ? attitudeOf(state, sc.site) : '';
  if (sc) return `stop|${sc.site.id}|${sc.stopping}|${r.plan[sc.site.id] || ''}|${r.stop ? r.stop.action : ''}|${won}|${raidWon}|${att}`;
  return `lever|${r.leg}|${r.nextChoice}|${armedUnlock}|${state.resources.keys}`;
}

export function updateSwitchboard() {
  if (!refs) return;
  const state = refs.getState();
  if (!state || !state.route.mode) return;
  const key = keyFor(state);
  if (key !== lastKey) {
    lastKey = key;
    build(state);
  }
  updateDynamic(state);
}

export function refreshSwitchboard() {
  lastKey = '';
  updateSwitchboard();
}

// ---------- Construction ----------
function build(state) {
  const r = state.route;
  refs.dyn = {};
  const box = refs.box;
  box.innerHTML = '';
  box.classList.remove('pulse');
  const sc = r.mode === 'depot' ? null : stopContext(state);
  if (sc) { buildStop(state, sc); return; }

  const head = el('div', { class: 'sb-head' });
  const title = el('p', { class: 'panel-title' });
  const timer = el('span', { class: 'sb-timer' });
  head.append(title, timer);
  refs.dyn.timer = timer;
  box.appendChild(head);

  if (r.mode === 'depot') {
    title.textContent = t('switch.depotTitle');
    timer.textContent = '';
    head.appendChild(depotShop(state));
  } else if (nextLegIndex(state) >= r.legs) {
    title.textContent = t('switch.toDepot');
  } else {
    title.textContent = t('switch.junction', { n: nextLegIndex(state) });
  }

  const leg = r.mode === 'depot' || nextLegIndex(state) < r.legs ? nextLeg(state) : null;
  const body = el('div', { class: 'sb-body' });
  if (leg) body.appendChild(buildLever(state, leg));
  else body.appendChild(el('div', { class: 'sb-cards' }, depotCard()));
  if (r.mode === 'depot') {
    const actions = el('div', { class: 'sb-depot-actions' },
      el('button', { class: 'btn btn-ghost btn-small', type: 'button', text: t('switch.summary'), onclick: () => refs.onSummary() }),
      el('button', { class: 'btn btn-primary btn-depart', type: 'button', text: t('switch.depart'), onclick: () => {
        departDepot(refs.getState());
        buzz([20, 40, 20]);
        refreshSwitchboard();
      } }));
    body.appendChild(actions);
    box.classList.add('depot');
  } else {
    box.classList.remove('depot');
  }
  box.appendChild(body);
}

// Ateliers du dépôt : réparer le convoi et refaire des munitions avec de la Ferraille
function depotShop(state) {
  const row = el('div', { class: 'sb-shop' });
  for (const [id, ico] of [['repair', 'shield'], ['rearm', 'ammo']]) {
    const o = depotOffer(state, id);
    const b = el('button', { class: 'btn btn-small sb-shop-btn', type: 'button', disabled: o.ok ? null : 'disabled',
      title: t('depot.' + id + 'Tip', { g: o.gain, c: o.cost.scrap }) },
    el('span', { class: 'sb-shop-ico' }),
    el('span', { text: o.full ? t('depot.full') : `+${o.gain}` }));
    b.querySelector('.sb-shop-ico').innerHTML = icon(ico);
    if (!o.full) {
      const cost = el('span', { class: 'sb-shop-cost' }, el('span', { class: 'muted', text: '−' + o.cost.scrap }), el('span'));
      cost.lastChild.innerHTML = icon('scrap');
      b.appendChild(cost);
    }
    b.addEventListener('click', () => {
      if (depotBuy(refs.getState(), id)) { buzz(10); toast(t('depot.' + id + 'Done', { g: o.gain })); refreshSwitchboard(); }
    });
    row.appendChild(b);
  }
  // Volontaire du dépôt
  const v = depotVisit(state);
  const rb = el('button', { class: 'btn btn-small sb-shop-btn' + (v.hired ? '' : ' sb-recruit'), type: 'button', title: t('depot.recruitTip') },
    el('span', { class: 'sb-shop-ico' }), el('span', { text: v.hired ? t('depot.recruitDone') : t('depot.recruit') }));
  rb.querySelector('.sb-shop-ico').innerHTML = icon('crew');
  rb.addEventListener('click', () => refs.onRecruit && refs.onRecruit());
  row.appendChild(rb);
  return row;
}

function depotCard() {
  const c = el('div', { class: 'sb-card selected' },
    el('span', { class: 'sb-card-ico' }),
    el('strong', { text: t('switch.depotCard') }),
    el('span', { class: 'sb-card-sub', text: t('switch.depotCardSub') }));
  c.querySelector('.sb-card-ico').innerHTML = icon('site_depot');
  return c;
}

function skulls(state, b) {
  let n = 0;
  for (const s of b.sites) {
    if (s.type === 'fortress') n = Math.max(n, 3);
    if (s.type !== 'camp') continue;
    const st = state.world.sites[s.id];
    const att = st ? st.attitude : CAMP_TYPES[s.camp].attitude;
    if (att === 'hostile') {
      const f = CAMP_TYPES[s.camp].strength * (1 + 0.25 * ((st && st.defense) || 0));
      n = Math.max(n, f < 5 ? 1 : f < 9 ? 2 : 3);
    } else if (att === 'suspicious') n = Math.max(n, 1);
  }
  return n;
}

function siteChip(state, s, known) {
  const chip = el('span', { class: 'sb-site' });
  chip.innerHTML = icon('site_' + s.type);
  const st = state.world.sites[s.id];
  if (known && st && st.lastSeen) {
    if (s.type === 'camp') {
      const dot = el('i', { class: 'sb-att att-' + (st.lastSeen.attitude || st.attitude) });
      chip.appendChild(dot);
    } else if (SITE_TYPES[s.type] && SITE_TYPES[s.type].yield) {
      const bar = el('i', { class: 'sb-stock' });
      const fill = el('b');
      fill.style.width = Math.round((st.lastSeen.stock ?? 1) * 100) + '%';
      bar.appendChild(fill);
      chip.appendChild(bar);
    }
  }
  return chip;
}

function card(state, b) {
  const r = state.route;
  const bs = state.world.branches[b.id];
  const known = bs && bs.known;
  const open = bs && bs.unlocked;
  const selected = r.nextChoice === b.id;
  const c = el('button', { class: 'sb-card' + (selected ? ' selected' : '') + (open ? '' : ' locked'), type: 'button' });
  // Deux lignes seulement (nom, puis détails), alignées en haut : rien n'est rogné sur un écran bas
  const line1 = (ico, name, extra) => {
    const row = el('span', { class: 'sb-card-l1' }, el('span', { class: 'sb-card-ico' }), el('strong', { text: name }));
    if (ico) row.firstChild.innerHTML = icon(ico); else row.firstChild.remove();
    if (extra) row.appendChild(extra);
    return row;
  };
  if (!open) {
    const armed = armedUnlock === b.id;
    c.append(line1('lock', known ? b.name : t('switch.unknown')),
      el('span', { class: 'sb-card-sub', text: armed ? t('switch.unlockAsk', { n: b.lockCost }) : t('switch.locked', { n: b.lockCost }) }));
    if (armed) c.classList.add('armed');
  } else if (!known) {
    const dots = el('span', { class: 'sb-dots' });
    // Cartographie (recherche) : on voit le type des arrêts, pas leur nom
    if (fxOn(state, 'mapping')) for (const s of b.sites) { const ic = el('span', { class: 'sb-mapico' }); ic.innerHTML = icon('site_' + s.type); dots.appendChild(ic); }
    else for (let i = 0; i < b.sites.length; i++) dots.appendChild(el('i'));
    c.append(line1('question', t('switch.unknown'), el('span', { class: 'sb-signal sig-' + b.signal })),
      el('span', { class: 'sb-card-sub' }, dots, document.createTextNode(t('switch.stops', { n: b.sites.length }))));
  } else {
    const sites = el('span', { class: 'sb-sites' });
    b.sites.forEach(s => sites.appendChild(siteChip(state, s, true)));
    const n = skulls(state, b);
    const sk = el('span', { class: 'sb-skulls' });
    for (let i = 0; i < n; i++) sk.innerHTML += icon('skull');
    const ago = bs.lastLap === null ? '' : (r.lap - bs.lastLap <= 0 ? t('switch.seenNow') : t('switch.seen', { n: r.lap - bs.lastLap }));
    c.title = b.name + (ago ? ' · ' + ago : '');
    c.append(line1(null, b.name, sk), el('span', { class: 'sb-card-sub' }, sites, el('span', { class: 'sb-ago', text: ago })));
  }
  c.addEventListener('click', () => onCard(b));
  return c;
}

function onCard(b) {
  const state = refs.getState();
  const bs = state.world.branches[b.id];
  if (!bs.unlocked) {
    if (armedUnlock !== b.id) {
      if ((state.resources.keys || 0) < b.lockCost) { toast(t('switch.needKeys', { n: b.lockCost }), 'warn'); return; }
      armedUnlock = b.id;
      refreshSwitchboard();
      return;
    }
    const res = unlockBranch(state, b.id);
    armedUnlock = null;
    if (res.ok) {
      toast(t('switch.unlocked', { name: b.name }));
      setChoice(state, b.id);
      buzz([15, 30, 15]);
    }
    refreshSwitchboard();
    return;
  }
  armedUnlock = null;
  if (setChoice(state, b.id)) buzz(15);
  refreshSwitchboard();
}

// Levier : poignée sur un rail, qu'on glisse sous la carte voulue (elle se cale toute seule)
function buildLever(state, leg) {
  const wrap = el('div', { class: 'sb-lever-wrap' });
  const cards = el('div', { class: 'sb-cards' });
  leg.branches.forEach(b => cards.appendChild(card(state, b)));
  const rail = el('div', { class: 'sb-rail' });
  const handle = el('div', { class: 'sb-handle', role: 'slider', 'aria-label': t('switch.title') });
  rail.appendChild(handle);
  wrap.append(cards, rail);

  const idx = () => Math.max(0, leg.branches.findIndex(b => b.id === refs.getState().route.nextChoice));
  const place = (i, animate) => {
    const n = leg.branches.length;
    handle.style.transition = animate ? 'left 0.15s ease-out' : 'none';
    handle.style.left = `calc(${((i + 0.5) / n) * 100}% - 14px)`;
  };
  requestAnimationFrame(() => place(idx(), false));

  let dragging = false;
  handle.addEventListener('pointerdown', e => {
    dragging = true;
    handle.setPointerCapture(e.pointerId);
    handle.classList.add('grab');
  });
  handle.addEventListener('pointermove', e => {
    if (!dragging) return;
    const rr = rail.getBoundingClientRect();
    const x = Math.max(0, Math.min(rr.width, e.clientX - rr.left));
    handle.style.transition = 'none';
    handle.style.left = (x - 14) + 'px';
  });
  const drop = e => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove('grab');
    const rr = rail.getBoundingClientRect();
    const n = leg.branches.length;
    const i = Math.max(0, Math.min(n - 1, Math.floor(((e.clientX - rr.left) / rr.width) * n)));
    const b = leg.branches[i];
    const state = refs.getState();
    if (state.world.branches[b.id].unlocked && setChoice(state, b.id)) {
      buzz(15);
      place(i, true);
      refreshSwitchboard();
    } else {
      place(idx(), true);
      if (!state.world.branches[b.id].unlocked) onCard(b);
    }
  };
  handle.addEventListener('pointerup', drop);
  handle.addEventListener('pointercancel', drop);
  return wrap;
}

// ---------- Panneau d'arrêt ----------
function fmtGain(gain) {
  const parts = Object.entries(gain).filter(([, v]) => v >= 0.5).map(([r, v]) => `+${Math.round(v)} ${t('res.' + r)}`);
  return parts.join(' · ');
}

function buildStop(state, sc) {
  const r = state.route;
  const box = refs.box;
  const site = sc.site;
  const st = state.world.sites[site.id] || {};
  const head = el('div', { class: 'sb-head' });
  const title = el('p', { class: 'panel-title sb-site-title' });
  title.innerHTML = icon('site_' + site.type) + `<span>${site.name}</span>`;
  const timer = el('span', { class: 'sb-timer' });
  refs.dyn.timer = timer;
  head.append(title, timer);
  box.appendChild(head);

  const body = el('div', { class: 'sb-body sb-stop' });
  if (site.type === 'fortress') { buildFortress(state, sc, site, st, body); box.appendChild(body); return; }
  if (site.type === 'station') { buildStation(state, sc, site, body); box.appendChild(body); return; }
  if (site.type === 'camp') { buildCamp(state, sc, site, st, body); box.appendChild(body); return; }
  if (!isHarvestSite(site)) {
    const msg = site.type === 'camp' ? 'stop.campSoon' : site.type === 'station' ? 'stop.stationSoon' : 'stop.fortressSoon';
    let sub = '';
    const att = site.type === 'camp' ? (st.attitude || CAMP_TYPES[site.camp].attitude) : null;
    if (site.type === 'camp') sub = `${t('camp.' + site.camp)} · ${t('attitude.' + att)}`;
    // Ce que fera le camp au passage du train (GDD §6.2)
    let threat = '';
    if (att === 'hostile') threat = t('stop.campHostile', { f: Math.round(campForce(state, site) * 10) / 10 });
    else if (att === 'wary') threat = t('stop.campWary');
    body.append(el('p', { class: 'sb-info', text: sub }));
    if (threat) body.append(el('p', { class: 'sb-info warn-text', text: threat }));
    body.append(el('p', { class: 'muted sb-info', text: t(msg) }));
    box.appendChild(body);
    return;
  }

  // État du site
  const stock = el('div', { class: 'sb-stockline' },
    el('span', { text: t('site.' + site.type) + ' · ' + t('stop.stock') }),
    el('i', { class: 'sb-stock big' }),
    el('span', { class: 'num', text: pct_(Math.round((st.stock ?? 1) * 100)) }));
  const fill = el('b');
  fill.style.width = Math.round((st.stock ?? 1) * 100) + '%';
  stock.querySelector('.sb-stock').appendChild(fill);
  body.appendChild(stock);

  if (sc.stopping) {
    const prog = el('div', { class: 'sb-progress' }, el('b'));
    refs.dyn.progress = prog.querySelector('b');
    const label = el('p', { class: 'sb-info', text: t('stop.inProgress', { action: t('action.' + r.stop.action) }) });
    const gain = el('p', { class: 'sb-info muted', text: fmtGain(r.stop.total) });
    const leave = el('button', { class: 'btn btn-primary btn-small', type: 'button', text: t('stop.leave'), onclick: () => {
      leaveStop(refs.getState());
      buzz(15);
      refreshSwitchboard();
    } });
    body.append(el('div', { class: 'sb-stop-row' }, el('div', { class: 'sb-stop-col' }, label, gain, prog), leave));
    box.appendChild(body);
    return;
  }

  const chosen = r.plan[site.id] || defaultAction(site, state);
  const row = el('div', { class: 'sb-actions' });
  for (const a of actionsFor(site, state)) {
    const A = ACTIONS[a];
    let sub;
    if (a === 'pass') sub = t('action.nothing');
    else {
      const g = fmtGain(previewGain(state, site, a)) || '+0';
      const pct = Math.round(A.stock * 100);
      sub = `${g} · ${t('action.stock', { v: (pct > 0 ? '+' : '−') + pct_(Math.abs(pct)) })}`;
      if (A.cost) sub += ' · ' + t('action.cost', { v: Object.entries(A.cost).map(([k, v]) => v + ' ' + t('res.' + k)).join(', ') });
    }
    const b = el('button', { class: 'sb-action' + (a === chosen ? ' selected' : '') + (a === 'pass' ? ' pass' : ''), type: 'button' },
      el('strong', { text: t('action.' + a) }),
      el('span', { text: sub }));
    b.addEventListener('click', () => {
      setPlan(refs.getState(), site.id, a);
      buzz(10);
      refreshSwitchboard();
    });
    row.appendChild(b);
  }
  body.appendChild(row);
  box.appendChild(body);
}

// ---------- Gare (GDD §8) : faire halte ou passer ; en Halte, ouvrir la gare ou repartir ----------
function buildStation(state, sc, site, body) {
  const r = state.route;
  if (sc.stopping) {
    body.append(el('div', { class: 'sb-stop-row' },
      el('div', { class: 'sb-stop-col' },
        el('p', { class: 'sb-info', text: t('station.inHalte') }),
        el('p', { class: 'sb-info muted', text: site.specialty ? t('spec.' + site.specialty + '.desc') : '' })),
      el('button', { class: 'btn btn-small', type: 'button', text: t('station.open'), onclick: () => refs.onStation && refs.onStation() }),
      el('button', { class: 'btn btn-primary btn-small', type: 'button', text: t('stop.leave'), onclick: () => {
        leaveStop(refs.getState()); buzz(15); refreshSwitchboard();
      } })));
    return;
  }
  const chosen = r.plan[site.id] || defaultAction(site, state);
  const row = el('div', { class: 'sb-actions' });
  for (const a of actionsFor(site, state)) {
    const sub = a === 'halt' ? (site.specialty ? t('spec.' + site.specialty) : t('station.haltSub')) : t('action.nothing');
    const b = el('button', { class: 'sb-action' + (a === chosen ? ' selected' : '') + (a === 'pass' ? ' pass' : ''), type: 'button' },
      el('strong', { text: t('action.' + a) }), el('span', { text: sub }));
    b.addEventListener('click', () => { setPlan(refs.getState(), site.id, a); buzz(10); refreshSwitchboard(); });
    row.appendChild(b);
  }
  body.append(el('p', { class: 'sb-info muted', text: t('station.approach') }), row);
}

// ---------- Camp (GDD §3.4) : halte, tribut, pillage ou passage ----------
const fmtCost = cost => Object.entries(cost).map(([k, v]) => v + ' ' + t('res.' + k)).join(', ');
function buildCamp(state, sc, site, st, body) {
  const r = state.route;
  const att = attitudeOf(state, site);
  const line = el('p', { class: 'sb-info' });
  const dot = el('span', { class: 'att-dot' });
  dot.style.background = ATTITUDE_COLORS[att];
  line.append(dot, document.createTextNode(`${t('camp.' + site.camp)} · ${t('attitude.' + att)} · ${t('camp.defense', { n: st.defense || 0 })}` + (st.grudge ? ' · ' + t('camp.grudge') : '')));
  body.appendChild(line);
  if (sc.stopping && r.stop && r.stop.action === 'halt') {
    body.append(el('div', { class: 'sb-stop-row' },
      el('div', { class: 'sb-stop-col' }, el('p', { class: 'sb-info muted', text: t('camp.inHalte') })),
      el('button', { class: 'btn btn-small', type: 'button', text: t('camp.open'), onclick: () => refs.onStation && refs.onStation() }),
      el('button', { class: 'btn btn-primary btn-small', type: 'button', text: t('stop.leave'), onclick: () => {
        leaveStop(refs.getState()); buzz(15); refreshSwitchboard();
      } })));
    return;
  }
  if (sc.stopping && r.stop && r.stop.action === 'raid') {
    const R = state.combat.raid;
    if (R && R.won) { body.append(el('p', { class: 'sb-info gain-text', text: t('camp.raidWon') }), el('p', { class: 'muted sb-info', text: t('fortress.wonSub') })); return; }
    const info = el('p', { class: 'sb-info', text: '' });
    refs.dyn.raidInfo = info;
    const flee = el('button', { class: 'btn btn-danger btn-small', type: 'button', text: t('fortress.flee'), onclick: () => {
      if (fleeRaid(refs.getState())) { buzz([30, 30]); refreshSwitchboard(); }
    } });
    body.append(el('div', { class: 'sb-stop-row' }, el('div', { class: 'sb-stop-col' }, info,
      el('p', { class: 'sb-info muted', text: t('fortress.fleeRule', { p: Math.round(COMBAT.fleeBelow * 100) }) })), flee));
    return;
  }
  const chosen = r.plan[site.id] || defaultAction(site, state);
  const row = el('div', { class: 'sb-actions' });
  for (const a of actionsFor(site, state)) {
    let sub = t('action.nothing');
    if (a === 'halt') sub = t(att === 'ally' || att === 'peaceful' ? 'camp.haltTrade' : 'camp.haltTalk');
    else if (a === 'tribute') { const c = tributeCost(state); sub = c ? t('camp.tributeSub', { c: fmtCost(c) }) : t('camp.tributeNo'); }
    else if (a === 'raid') sub = fmtGain(raidPreview(state, site)) + ' · ' + t(att === 'hostile' ? 'camp.raidHostile' : 'camp.raidAnger');
    else if (att === 'hostile') sub = t('camp.passHostile', { f: Math.round(campForce(state, site) * 10) / 10 });
    else if (att === 'suspicious') sub = t('camp.passSuspicious');
    const b = el('button', { class: 'sb-action' + (a === chosen ? ' selected' : '') + (a === 'pass' ? ' pass' : '') + (a === 'raid' ? ' danger' : ''), type: 'button' },
      el('strong', { text: t('action.' + a) }), el('span', { text: sub }));
    b.addEventListener('click', () => { setPlan(refs.getState(), site.id, a); buzz(10); refreshSwitchboard(); });
    row.appendChild(b);
  }
  body.appendChild(row);
}

// ---------- Forteresse (GDD §6.6) : assaut ou passage, puis combat contre le boss ----------
function buildFortress(state, sc, site, st, body) {
  const r = state.route;
  const bossId = site.boss || 'boss_c' + r.ring;
  const B = BOSSES[bossId];
  if (st.fallen) {
    body.append(el('p', { class: 'sb-info', text: t('fortress.fallen') }), el('p', { class: 'muted sb-info', text: t('fortress.fallenSub') }));
    return;
  }
  if (sc.stopping) {
    const a = state.combat && state.combat.assault;
    if (a && a.won) {
      body.append(el('p', { class: 'sb-info gain-text', text: t('fortress.won') }), el('p', { class: 'muted sb-info', text: t('fortress.wonSub') }));
      return;
    }
    const prog = el('div', { class: 'sb-progress boss' }, el('b'));
    refs.dyn.bossBar = prog.querySelector('b');
    const flee = el('button', { class: 'btn btn-danger btn-small', type: 'button', text: t('fortress.flee'), onclick: () => {
      if (fleeAssault(refs.getState())) { buzz([30, 30]); refreshSwitchboard(); }
    } });
    body.append(el('div', { class: 'sb-stop-row' }, el('div', { class: 'sb-stop-col' },
      el('p', { class: 'sb-info', text: t('fortress.fighting', { boss: t('boss.' + bossId) }) }),
      el('p', { class: 'sb-info muted', text: t('fortress.fleeRule', { p: Math.round(COMBAT.fleeBelow * 100) }) }),
      prog), flee));
    return;
  }
  body.append(el('p', { class: 'sb-info', text: t('fortress.boss', { boss: t('boss.' + bossId), hp: B.hp }) }));
  const chosen = r.plan[site.id] || defaultAction(site, state);
  const row = el('div', { class: 'sb-actions' });
  const R = COMBAT.fortressReward;
  for (const a of actionsFor(site, state)) {
    const sub = a === 'assault'
      ? t('fortress.reward', { k: R.keys, s: R.scrap, a: R.ammo, n: R.know })
      : t('action.nothing');
    const b = el('button', { class: 'sb-action' + (a === chosen ? ' selected' : '') + (a === 'pass' ? ' pass' : ''), type: 'button' },
      el('strong', { text: t('action.' + a) }), el('span', { text: sub }));
    b.addEventListener('click', () => { setPlan(refs.getState(), site.id, a); buzz(10); refreshSwitchboard(); });
    row.appendChild(b);
  }
  body.appendChild(row);
}

// ---------- Mise à jour légère (comptes à rebours, barres) ----------
function updateDynamic(state) {
  const r = state.route;
  const d = refs.dyn;
  if (r.mode === 'depot') return;
  const sc = stopContext(state);
  if (sc && d.timer) {
    if (sc.stopping && r.stop && r.stop.action === 'halt') { d.timer.textContent = ''; return; }
    if (sc.stopping && r.stop && r.stop.action === 'raid') {
      d.timer.textContent = t('fortress.elapsed', { s: Math.floor(r.stop.t) });
      const R = state.combat.raid;
      const n = R ? state.combat.enemies.filter(e => e.wave === R.wave && (e.phase === 'approach' || e.phase === 'attached')).length
        + state.combat.queue.filter(q => q.wave === R.wave).length : 0;
      if (d.raidInfo) d.raidInfo.textContent = t('camp.raidLeft', { n });
      return;
    }
    if (sc.stopping && r.stop && r.stop.action === 'assault') {
      d.timer.textContent = t('fortress.elapsed', { s: Math.floor(r.stop.t) });
      const boss = state.combat.enemies.find(e => e.boss);
      const a = state.combat.assault;
      if (d.bossBar) d.bossBar.style.width = (boss ? Math.max(0, boss.hp / boss.max) * 100 : a && a.bossDead ? 0 : 100) + '%';
      return;
    }
    if (sc.stopping) {
      const left = Math.max(0, r.stop.dur - r.stop.t);
      d.timer.textContent = t('switch.in', { s: Math.ceil(left) });
      if (d.progress) d.progress.style.width = Math.min(100, (r.stop.t / r.stop.dur) * 100) + '%';
    } else {
      d.timer.textContent = t('stop.arriving', { s: Math.ceil(sc.secs) });
    }
    return;
  }
  const s = secondsToJunction(state);
  if (d.timer && s !== null) d.timer.textContent = t('switch.in', { s: Math.ceil(s) });
  refs.box.classList.toggle('pulse', s !== null && s < ROUTE.switchWarnSec && nextLegIndex(state) < r.legs);
}
