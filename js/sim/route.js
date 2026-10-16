// Le trajet (GDD §3.1, §3.6, §3.7) : tronçons, embranchements, arrêts, aiguillages, dépôt.
// Unités : distance du train (1 unité ≈ 1 px à l'échelle 1 ; 120 unités par seconde à vitesse ×1).
import { BALANCE } from '../data/balance.js';
import { getCircuit, findBranch } from '../data/circuits.js';
import { SITE_TYPES, ACTIONS, ROUTE } from '../data/sites.js';
import { initWorld, siteState, markSeen, markBranchKnown, siteYield } from './world.js';
import { harvestMultiplier } from './energy.js';
import { updateRepairs } from './repair.js';
import { onTransit, onJunction, startAssault, startRaid, steamActive } from './combat.js';
import { campActions, campDefault, campArrive, raidAggression } from './camp.js';
import { rollEvent, eventSpeed } from './events.js';
import { arriveDepot } from './depot.js';
import { stationVisit } from './station.js';
export { derailToDepot } from './depot.js';
import { COMBAT } from '../data/enemies.js';
import { capacities } from '../core/state.js';
import { rngNext } from '../core/rng.js';
import { bus } from '../core/bus.js';

export { repairers, repairRate, repairNow, canAutoRepair, sendToRepair } from './repair.js';

// ---------- Vitesse ----------
export function trainSpeed(state) {
  const base = BALANCE.locoSpeed[state.train.loco] || 1;
  const factor = state.power ? state.power.factor : 1;
  const steam = steamActive(state) ? COMBAT.abilities.fullsteam.speed : 1;   // Pleine vapeur
  return base * factor * steam * eventSpeed(state);
}

// Écran titre : le train roule simplement
export function scrollDemo(state, dt) {
  const r = state.route;
  r.prevDistance = r.distance;
  r.distance += BALANCE.scroll.nearPxPerSec * dt;
}

// ---------- Création / réparation de l'état du trajet ----------
export function newRoute(ring = 1) {
  return {
    ring, lap: 1, leg: 0, legs: getCircuit(ring).legs.length,
    distance: 0, prevDistance: 0,
    mode: 'depot',           // run | stop | depot
    legStart: 0,
    branch: null,            // embranchement du tronçon en cours
    nextChoice: null,        // embranchement choisi au levier pour le tronçon suivant
    stopIdx: 0,              // prochain arrêt de l'embranchement
    stop: null,              // arrêt en cours
    plan: {},                // actions choisies à l'avance pour les arrêts à venir
    lapStats: null
  };
}

export function ensureRoute(state) {
  const r = state.route;
  if (!r || !r.mode) {
    const old = r || {};
    state.route = Object.assign(newRoute(old.ring || 1), { lap: old.lap || 1, distance: old.distance || 0, prevDistance: old.distance || 0 });
  }
  initWorld(state, state.route.ring);
  const rr = state.route;
  if (!rr.nextChoice) rr.nextChoice = defaultChoice(state, rr.mode === 'depot' ? 0 : rr.leg + 1);
  if (!rr.lapStats) startLapStats(state);
}

// ---------- Géométrie du tronçon ----------
export function currentLeg(state) {
  return getCircuit(state.route.ring).legs[state.route.leg] || null;
}

export function nextLegIndex(state) {
  const r = state.route;
  return r.mode === 'depot' ? 0 : r.leg + 1;
}

export function nextLeg(state) {
  return getCircuit(state.route.ring).legs[nextLegIndex(state)] || null;
}

export function currentBranch(state) {
  return state.route.branch ? findBranch(state.route.ring, state.route.branch) : null;
}

// Position (distance) de l'arrêt k et de l'aiguillage de fin
export function sitePos(state, k) {
  return state.route.legStart + ROUTE.transit * (k + 1);
}
export function junctionPos(state) {
  const b = currentBranch(state);
  return state.route.legStart + ROUTE.transit * ((b ? b.sites.length : 0) + 1);
}

// Prochain arrêt et distance avant lui
export function upcomingSite(state) {
  const r = state.route;
  const b = currentBranch(state);
  if (r.mode !== 'run' || !b || r.stopIdx >= b.sites.length) return null;
  const site = b.sites[r.stopIdx];
  return { site, dist: sitePos(state, r.stopIdx) - r.distance };
}

// Secondes avant l'aiguillage (à la vitesse actuelle), en ignorant les arrêts
export function secondsToJunction(state) {
  const r = state.route;
  if (r.mode === 'depot') return null;
  const v = BALANCE.scroll.nearPxPerSec * Math.max(0.05, trainSpeed(state));
  return Math.max(0, (junctionPos(state) - r.distance) / v);
}

// Un arrêt peut-il se faire à ce site ? (camps et gares : jalon J6)
export function isHarvestSite(site) {
  const t = SITE_TYPES[site.type];
  return !!(t && t.yield);
}

// Forteresse encore debout : on peut lancer l'assaut
export function fortressStanding(state, site) {
  if (site.type !== 'fortress') return false;
  const st = state && state.world.sites[site.id];
  return !(st && st.fallen);
}

// Halte (GDD §3.16) : au dépôt ou en gare, le temps est figé
export function isHalte(state) {
  const r = state.route;
  return r.mode === 'depot' || (r.mode === 'stop' && !!r.stop && r.stop.action === 'halt');
}

export function actionsFor(site, state) {
  if (site.type === 'station') return ['halt', 'pass'];
  if (site.type === 'camp' && state) return campActions(state, site);
  if (fortressStanding(state, site)) return ['assault', 'pass'];
  if (!isHarvestSite(site)) return ['pass'];
  return SITE_TYPES[site.type].replant ? ['durable', 'intensive', 'replant', 'pass'] : ['durable', 'intensive', 'pass'];
}

export function defaultAction(site, state) {
  if (site.type === 'station') return 'halt';
  if (site.type === 'camp' && state) return campDefault(state, site);
  if (fortressStanding(state, site)) return 'assault';
  return isHarvestSite(site) ? 'durable' : 'pass';
}

// Le joueur a-t-il un choix à faire à ce site ? (vitesse automatique, panneau d'arrêt)
export function hasChoice(state, site) {
  return actionsFor(site, state).length > 1;
}

// Gains prévus d'une action (pour l'affichage et pour l'arrêt)
export function previewGain(state, site, action) {
  const y = siteYield(state.route.ring, site.id);
  const st = siteState(state, site.id);
  if (!y || !st) return {};
  const A = ACTIONS[action];
  const k = A.factor * st.stock * harvestMultiplier(state) * getCircuit(state.route.ring).lootMult * BALANCE.incomeMult;
  const out = {};
  for (const [r, v] of Object.entries(y)) out[r] = v * k;
  return out;
}

// ---------- Aiguillage ----------
export function defaultChoice(state, legIndex) {
  const leg = getCircuit(state.route.ring).legs[legIndex];
  return leg ? leg.defaultBranch : null;
}

export function branchOpen(state, id) {
  const b = state.world.branches[id];
  return !!(b && b.unlocked);
}

export function setChoice(state, id) {
  const leg = nextLeg(state);
  if (!leg || !leg.branches.some(b => b.id === id)) return false;
  if (!branchOpen(state, id)) return false;
  state.route.nextChoice = id;
  bus.emit('route:choice', id);
  return true;
}

export function unlockBranch(state, id) {
  const b = findBranch(state.route.ring, id);
  const st = state.world.branches[id];
  if (!b || !st || st.unlocked) return { ok: false };
  const cost = b.lockCost || 0;
  if ((state.resources.keys || 0) < cost) return { ok: false, reason: 'keys', cost };
  state.resources.keys -= cost;
  st.unlocked = true;
  bus.emit('route:unlocked', b);
  return { ok: true };
}

export function setPlan(state, siteId, action) {
  state.route.plan[siteId] = action;
  bus.emit('route:plan', { siteId, action });
}

// ---------- Statistiques du tour ----------
export function startLapStats(state) {
  state.route.lapStats = {
    start: { ...state.resources },
    gained: {},
    stops: 0,
    breakdowns: 0,
    newBranches: 0,
    keys: 0,
    waves: 0,
    kills: 0,
    derailed: false
  };
}

export function addGain(state, res, v) {
  const g = state.route.lapStats.gained;
  g[res] = (g[res] || 0) + v;
}

// ---------- Départ du dépôt ----------
export function departDepot(state) {
  const r = state.route;
  if (r.mode !== 'depot') return;
  r.leg = 0;
  r.legStart = r.distance;
  r.branch = branchOpen(state, r.nextChoice) ? r.nextChoice : defaultChoice(state, 0);
  r.stopIdx = 0;
  r.stop = null;
  r.mode = 'run';
  r.nextChoice = defaultChoice(state, 1);
  enterBranch(state);
  bus.emit('route:depart');
  onTransit(state);
}

// En s'engageant sur un embranchement, le train le découvre : il apparaît sur la carte
function enterBranch(state) {
  const b = currentBranch(state);
  const wasKnown = state.world.branches[b.id].known;
  markBranchKnown(state, b.id);
  if (!wasKnown) state.route.lapStats.newBranches += 1;
  bus.emit('route:branch', { branch: b, discovered: !wasKnown });
  rollEvent(state);       // un événement surviendra peut-être pendant ce tronçon (GDD §7)
}

// ---------- Arrêts ----------
function arriveAt(state, site) {
  const r = state.route;
  markSeen(state, site.id);
  let action = r.plan[site.id] || defaultAction(site, state);
  delete r.plan[site.id];
  if (!actionsFor(site, state).includes(action)) action = defaultAction(site, state);
  if (action === 'pass' || action === 'tribute') {      // le tribut se paie à l'approche (combat.js)
    bus.emit('route:passed', site);
    r.stopIdx += 1;
    onTransit(state);
    return;
  }
  if (action === 'halt') {
    // Gare : Halte, le panneau de la gare s'ouvre (GDD §8)
    r.mode = 'stop';
    r.distance = sitePos(state, r.stopIdx);
    r.prevDistance = r.distance;
    r.stop = { site: site.id, action, t: 0, dur: 0, picks: 0, total: {}, stockDelta: 0 };
    state.route.lapStats.stops += 1;
    if (site.type === 'camp') campArrive(state, site); else stationVisit(state, site);
    bus.emit('route:stop', { site, action });
    bus.emit('route:halt', site);
    return;
  }
  if (action === 'raid') {
    // Pillage d'un camp : agression immédiate, puis combat à l'arrêt jusqu'à la victoire ou la fuite
    r.mode = 'stop';
    r.distance = sitePos(state, r.stopIdx);
    r.prevDistance = r.distance;
    r.stop = { site: site.id, action, t: 0, dur: 0, picks: 0, total: {}, stockDelta: 0 };
    state.route.lapStats.stops += 1;
    raidAggression(state, site);
    bus.emit('route:stop', { site, action });
    startRaid(state, site);
    return;
  }
  if (action === 'assault') {
    // Assaut d'une forteresse : le train s'arrête jusqu'à la victoire ou la fuite (GDD §6.7)
    r.mode = 'stop';
    r.distance = sitePos(state, r.stopIdx);
    r.prevDistance = r.distance;
    r.stop = { site: site.id, action, t: 0, dur: 0, picks: 0, total: {}, stockDelta: 0 };
    bus.emit('route:stop', { site, action });
    startAssault(state, site);
    return;
  }
  const A = ACTIONS[action];
  if (A.cost) {
    for (const [res, v] of Object.entries(A.cost)) {
      if ((state.resources[res] || 0) < v) {
        bus.emit('route:cantAfford', { site, action });
        r.stopIdx += 1;
        return;
      }
    }
    for (const [res, v] of Object.entries(A.cost)) state.resources[res] -= v;
  }
  r.mode = 'stop';
  r.distance = sitePos(state, r.stopIdx);
  r.prevDistance = r.distance;
  r.stop = {
    site: site.id, action, t: 0, dur: A.dur, picks: 0,
    total: previewGain(state, site, action),
    stockDelta: A.stock
  };
  state.route.lapStats.stops += 1;
  bus.emit('route:stop', { site, action });
}

function pickup(state) {
  const r = state.route;
  const s = r.stop;
  const n = ROUTE.pickups;
  const caps = capacities(state);
  const got = {};
  for (const [res, v] of Object.entries(s.total)) {
    const add = v / n;
    const before = state.resources[res] || 0;
    state.resources[res] = Math.min(caps[res], before + add);
    const real = state.resources[res] - before;
    if (real > 0) { got[res] = real; addGain(state, res, real); }
  }
  const st = siteState(state, s.site);
  st.stock = Math.max(0, Math.min(1, st.stock + s.stockDelta / n));
  s.picks += 1;
  // Ruines : petite chance de trouver une clé de voie au dernier ramassage
  if (s.picks === n) {
    const site = currentBranch(state).sites[r.stopIdx];
    const type = SITE_TYPES[site.type];
    if (type.keyChance && s.action !== 'replant' && rngNext(state) < type.keyChance) {
      state.resources.keys = Math.min(99, (state.resources.keys || 0) + 1);
      state.route.lapStats.keys += 1;
      bus.emit('route:key', site);
    }
  }
  bus.emit('route:pickup', { got, site: s.site });
}

export function leaveStop(state) {
  const r = state.route;
  if (r.mode !== 'stop') return;
  const site = currentBranch(state).sites[r.stopIdx];
  markSeen(state, site.id);
  r.stop = null;
  r.mode = 'run';
  r.stopIdx += 1;
  bus.emit('route:leave', site);
  onTransit(state);
}

// ---------- Fin d'embranchement : pannes, tronçon suivant ----------
function rollBreakdowns(state) {
  const workshops = state.train.wagons.filter(w => w.type === 'workshop' && !w.broken).length;
  const chance = ROUTE.breakdownChance / (1 + 0.2 * workshops);
  for (const w of state.train.wagons) {
    if (w.broken) continue;
    if (rngNext(state) < chance) {
      w.broken = true;
      w.repairT = 0;
      state.route.lapStats.breakdowns += 1;
      bus.emit('wagon:broken', w);
    }
  }
}

function reachJunction(state) {
  const r = state.route;
  const b = currentBranch(state);
  markBranchKnown(state, b.id);
  if (b.traverseTo) bus.emit('route:traverseSoon', b);
  onJunction(state);        // les ennemis décrochent à l'aiguillage
  rollBreakdowns(state);
  r.leg += 1;
  if (r.leg >= r.legs) { arriveDepot(state); return; }
  r.legStart = junctionPos(state);
  r.branch = branchOpen(state, r.nextChoice) ? r.nextChoice : defaultChoice(state, r.leg);
  r.stopIdx = 0;
  r.nextChoice = defaultChoice(state, r.leg + 1);
  bus.emit('route:junction', { leg: r.leg });
  enterBranch(state);
  onTransit(state);
}

// Fenêtre de décision : un arrêt de récolte approche (8 s) ou le train est arrêté sur un site
export function decisionContext(state) {
  const r = state.route;
  if (r.mode === 'stop') {
    const site = currentBranch(state).sites[r.stopIdx];
    return site ? { site, stopping: true } : null;
  }
  const up = upcomingSite(state);
  if (!up) return null;
  const v = BALANCE.scroll.nearPxPerSec * Math.max(0.3, trainSpeed(state));
  const secs = up.dist / v;
  // Camps : on décide plus tôt (ils réagissent avant que le train arrive à leur hauteur)
  if (secs > (up.site.type === 'camp' ? ROUTE.campDecisionSec : ROUTE.decisionSec)) return null;
  return { site: up.site, stopping: false, secs };
}

// ---------- Pas de simulation ----------
export function updateRoute(state, dt) {
  const r = state.route;
  r.prevDistance = r.distance;
  if (r.mode === 'depot') return;
  updateRepairs(state, dt);

  if (r.mode === 'stop') {
    const s = r.stop;
    s.t += dt;
    if (s.action === 'assault' || s.action === 'raid') return;   // l'assaut se termine par la victoire ou la fuite
    const due = Math.min(ROUTE.pickups, Math.floor((s.t / s.dur) * ROUTE.pickups + 1e-6));
    while (s.picks < due) pickup(state);
    if (s.t >= s.dur) leaveStop(state);
    return;
  }

  // En route
  r.distance += BALANCE.scroll.nearPxPerSec * trainSpeed(state) * BALANCE.gameSpeed * dt;
  const b = currentBranch(state);
  if (b && r.stopIdx < b.sites.length) {
    const pos = sitePos(state, r.stopIdx);
    if (r.distance >= pos) {
      r.distance = pos;
      arriveAt(state, b.sites[r.stopIdx]);
    }
    return;
  }
  if (r.distance >= junctionPos(state)) {
    r.distance = junctionPos(state);
    reachJunction(state);
  }
}

// Le train roule-t-il ? (traction demandée à la chaudière)
export function isRunning(state) {
  return state.route && state.route.mode === 'run';
}
