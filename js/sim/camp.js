// Contacts avec les camps (GDD §3.4, §3.5, §8.5) : attitudes, commerce, aide, négociation, tribut, pillage,
// rancune et « le monde se souvient » (tick du monde au dépôt).
import { CAMP, CAMP_TYPES, ATTITUDES } from '../data/sites.js';
import { STATION } from '../data/stations.js';
import { getCircuit } from '../data/circuits.js';
import { BALANCE } from '../data/balance.js';
import { capacities } from '../core/state.js';
import { rngNext } from '../core/rng.js';
import { bus } from '../core/bus.js';
import { addGain } from './route.js';
import { newRecruit, hireFrom, canHire } from './station.js';

const pick = (state, list) => list[Math.floor(rngNext(state) * list.length)];
const canPay = (state, cost) => Object.entries(cost).every(([r, v]) => (state.resources[r] || 0) >= v);
const pay = (state, cost) => { for (const [r, v] of Object.entries(cost)) state.resources[r] -= v; };

export const campState = (state, site) => state.world.sites[site.id];
export function attitudeOf(state, site) {
  const st = campState(state, site);
  return (st && st.attitude) || CAMP_TYPES[site.camp].attitude;
}
const rank = att => ATTITUDES.indexOf(att);

// Change l'attitude d'un camp de d niveaux (un Repaire de pillards reste hostile). Renvoie la nouvelle attitude.
export function shiftAttitude(state, site, d) {
  const st = campState(state, site);
  if (!st) return null;
  if (d < 0) st.trust = 0;
  const before = attitudeOf(state, site);
  let i = Math.max(0, Math.min(ATTITUDES.length - 1, rank(before) + d));
  if (site.camp === 'raiders') i = 0;
  st.attitude = ATTITUDES[i];
  if (st.attitude !== before) bus.emit('camp:attitude', { site, from: before, to: st.attitude });
  return st.attitude;
}

// Camps voisins : ceux du même embranchement
export function neighbors(state, site) {
  for (const leg of getCircuit(state.route.ring).legs) {
    for (const b of leg.branches) {
      if (b.sites.some(s => s.id === site.id)) return b.sites.filter(s => s.type === 'camp' && s.id !== site.id);
    }
  }
  return [];
}

// Facteur de ressources (GDD §3.4) : 0,5 + 0,5 × moyenne des stocks des sites liés ; 1 sans site lié
export function linkedStock(state, site) {
  if (!site.links || !site.links.length) return null;
  const v = site.links.map(id => (state.world.sites[id] ? state.world.sites[id].stock : 1));
  return v.reduce((a, b) => a + b, 0) / v.length;
}
export function resFactor(state, site) {
  const avg = linkedStock(state, site);
  return avg === null ? 1 : 0.5 + 0.5 * avg;
}

// ---------- Actions possibles à l'approche ----------
export function campActions(state, site) {
  return attitudeOf(state, site) === 'hostile' ? ['tribute', 'raid', 'pass'] : ['halt', 'raid', 'pass'];
}
export function campDefault(state, site) {
  const att = attitudeOf(state, site);
  return att === 'ally' || att === 'peaceful' ? 'halt' : 'pass';
}

// ---------- Halte au camp ----------
export const tradesOpen = (state, site) => !!CAMP.trade[site.camp] && (attitudeOf(state, site) === 'ally' || attitudeOf(state, site) === 'peaceful');

function makeTrade(state, site) {
  const T = CAMP.trade[site.camp];
  const from = pick(state, T.buys);
  const to = pick(state, T.sells.filter(r => r !== from));
  const loot = getCircuit(state.route.ring).lootMult;
  const worth = (STATION.giveRange[0] + rngNext(state) * (STATION.giveRange[1] - STATION.giveRange[0])) * loot;
  const x = Math.max(2, Math.round(worth / STATION.values[from]));
  const rate = STATION.rate[0] + rngNext(state) * (STATION.rate[1] - STATION.rate[0]);
  return { from, x, to, y0: x * STATION.values[from] / STATION.values[to] * rate, done: false };
}

// Offres du camp pour ce tour (tirées une seule fois)
export function campVisit(state, site) {
  const st = campState(state, site);
  const lap = state.route.lap;
  if (st.visit && st.visit.lap === lap) return st.visit;
  const trades = [];
  if (CAMP.trade[site.camp]) for (let i = 0; i < CAMP.trades; i++) trades.push(makeTrade(state, site));
  st.visit = { lap, trades, recruits: [newRecruit(state)], hired: false, aided: false, negotiated: false };
  return st.visit;
}

// À l'arrivée en Halte : un camp allié offre une clé de voie la première fois
export function campArrive(state, site) {
  const st = campState(state, site);
  campVisit(state, site);
  if (attitudeOf(state, site) === 'ally' && !st.allyKey) giveAllyKey(state, site);
}

function giveAllyKey(state, site) {
  const st = campState(state, site);
  st.allyKey = true;
  state.resources.keys = Math.min(BALANCE.storage.keysCap, (state.resources.keys || 0) + CAMP.allyKey);
  if (state.route.lapStats) state.route.lapStats.keys += CAMP.allyKey;
  bus.emit('camp:allyKey', site);
}

export function campTradeGet(state, site, tr) {
  const best = Math.max(0, ...state.crew.map(s => s.skills.sav || 0));
  const bonus = Math.min(STATION.savoirMax, STATION.savoirBonus * best);
  return Math.max(1, Math.round(tr.y0 * (CAMP.rate[attitudeOf(state, site)] || 1) * (1 + bonus)));
}

export function doCampTrade(state, site, i) {
  const v = campVisit(state, site);
  const tr = v.trades[i];
  if (!tr || tr.done || !tradesOpen(state, site)) return { ok: false };
  if ((state.resources[tr.from] || 0) < tr.x) return { ok: false, reason: 'cost' };
  const y = campTradeGet(state, site, tr);
  state.resources[tr.from] -= tr.x;
  const cap = capacities(state)[tr.to] ?? Infinity;
  const before = state.resources[tr.to] || 0;
  state.resources[tr.to] = Math.min(cap, before + y);
  addGain(state, tr.to, state.resources[tr.to] - before);
  tr.done = true;
  state.stats.trades = (state.stats.trades || 0) + 1;
  return { ok: true, got: state.resources[tr.to] - before, lost: before + y - state.resources[tr.to] };
}

// Aider : Allié à Méfiant (pas les pillards), une fois par passage
export const trustLeft = (state, site) => CAMP.allyAids - ((campState(state, site).trust) || 0);
export function canAid(state, site, k) {
  const v = campVisit(state, site);
  if (site.camp === 'raiders' || attitudeOf(state, site) === 'hostile') return { ok: false, reason: 'hostile' };
  if (v.aided) return { ok: false, reason: 'done' };
  if (!canPay(state, CAMP.aid[k])) return { ok: false, reason: 'cost' };
  return { ok: true };
}

export function aidCamp(state, site, k) {
  const c = canAid(state, site, k);
  if (!c.ok) return c;
  const st = campState(state, site);
  const v = campVisit(state, site);
  pay(state, CAMP.aid[k]);
  v.aided = true;
  const wasAlly = attitudeOf(state, site) === 'ally';
  // Devenir allié demande deux aides (lors de deux passages) : la confiance se gagne
  let att;
  if (attitudeOf(state, site) === 'peaceful' && (st.trust || 0) + 1 < CAMP.allyAids) {
    st.trust = (st.trust || 0) + 1;
    att = 'peaceful';
  } else {
    att = shiftAttitude(state, site, 1);
    if (att === 'ally') st.trust = 0;
  }
  // Deux aides lors de deux passages de suite effacent la rancune
  let forgiven = false;
  if (st.grudge && st.lastAidLap === state.route.lap - 1) { st.grudge = false; forgiven = true; }
  st.lastAidLap = state.route.lap;
  if (!wasAlly && att === 'ally' && !st.allyKey) giveAllyKey(state, site);
  return { ok: true, att, forgiven };
}

// Négocier : Prudent ou Méfiant, une fois par passage
export function canNegotiate(state, site) {
  const att = attitudeOf(state, site);
  if (att !== 'wary' && att !== 'suspicious') return { ok: false, reason: 'attitude' };
  if (campVisit(state, site).negotiated) return { ok: false, reason: 'done' };
  if (!canPay(state, CAMP.negotiate)) return { ok: false, reason: 'cost' };
  return { ok: true };
}

export function negotiate(state, site) {
  const c = canNegotiate(state, site);
  if (!c.ok) return c;
  pay(state, CAMP.negotiate);
  campVisit(state, site).negotiated = true;
  return { ok: true, att: shiftAttitude(state, site, 1) };
}

// Recrue offerte par un camp allié (couchage libre requis)
export function canHireAtCamp(state, site) {
  if (attitudeOf(state, site) !== 'ally') return { ok: false, reason: 'attitude' };
  return canHire(state, campVisit(state, site), true);
}
export function hireAtCamp(state, site, i) {
  if (attitudeOf(state, site) !== 'ally') return { ok: false };
  return hireFrom(state, campVisit(state, site), i, true);
}

// ---------- Tribut (camp hostile, à l'approche) ----------
export function tributeCost(state) {
  return CAMP.tribute.find(c => canPay(state, c)) || null;
}
export function payTribute(state) {
  const cost = tributeCost(state);
  if (!cost) return null;
  pay(state, cost);
  return cost;
}

// ---------- Pillage ----------
// Agression (immédiat) : un camp non hostile baisse d'un niveau et garde rancune ; ses voisins non hostiles aussi
export function raidAggression(state, site) {
  const st = campState(state, site);
  if (attitudeOf(state, site) === 'hostile') return;
  shiftAttitude(state, site, -1);
  st.grudge = true;
  for (const n of neighbors(state, site)) if (attitudeOf(state, n) !== 'hostile') shiftAttitude(state, n, -1);
  bus.emit('camp:angered', site);
}

export function raidPreview(state, site) {
  const k = resFactor(state, site) * getCircuit(state.route.ring).lootMult * BALANCE.incomeMult;
  return Object.fromEntries(Object.entries(CAMP.raidLoot[site.camp]).map(([r, v]) => [r, Math.round(v * k)]));
}

// Victoire : butin, défense −2
export function raidVictory(state, site) {
  const st = campState(state, site);
  const loot = raidPreview(state, site);
  st.defense = Math.max(0, (st.defense || 0) - CAMP.raidDefenseLoss);
  st.raided = (st.raided || 0) + 1;
  return loot;
}

// ---------- Le monde se souvient (tick du monde, GDD §3.5) ----------
export function campTick(state, ring) {
  const news = [];
  const lap = state.route.lap;
  for (const leg of getCircuit(ring).legs) for (const b of leg.branches) for (const site of b.sites) {
    if (site.type !== 'camp') continue;
    const st = state.world.sites[site.id];
    if (!st) continue;
    // Rancune : il se fortifie et se ferme
    if (st.grudge) {
      st.defense = Math.min(CAMP.maxDefense, (st.defense || 0) + 1);
      const before = attitudeOf(state, site);
      shiftAttitude(state, site, -1);
      news.push({ key: before === 'hostile' ? 'news.fortify' : 'news.grudge', site: site.name });
    }
    const avg = linkedStock(state, site);
    if (avg === null) continue;
    // Région affamée
    if (avg <= 0.25) {
      if (attitudeOf(state, site) !== 'hostile') {
        shiftAttitude(state, site, -1);
        news.push({ key: 'news.starving', site: site.name });
      } else if ((st.defense || 0) > 0) {
        st.defense -= 1;
        news.push({ key: 'news.weakened', site: site.name });
      }
    } else if (avg > 0.7 && attitudeOf(state, site) === 'hostile' && lap % 2 === 0 && (st.defense || 0) < CAMP.maxDefense) {
      // Prospérité : un camp hostile se renforce un tour sur deux
      st.defense += 1;
      news.push({ key: 'news.prosper', site: site.name });
    }
  }
  return news;
}
