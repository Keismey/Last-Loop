// Gares (GDD §8) : trocs, recrue, réparation, clé de voie, rumeur, réputation et spécialités.
// Les offres sont tirées à chaque passage (une fois par tour) et rangées dans world.sites[id].visit.
import { STATION, SPECIALTIES } from '../data/stations.js';
import { getCircuit, findSite } from '../data/circuits.js';
import { BALANCE } from '../data/balance.js';
import { capacities } from '../core/state.js';
import { rngNext } from '../core/rng.js';
import { bus } from '../core/bus.js';
import { createSurvivor, bedsTotal } from './crew.js';
import { maxIntegrity } from './combat.js';
import { addItem, randomShopItem } from './equipment.js';
import { WEAPONS, itemDef, DEFENSE } from '../data/items.js';
import { RECRUIT_KIT } from '../data/items.js';
import { markBranchKnown, markSeen } from './world.js';
import { addGain } from './route.js';

const pick = (state, list) => list[Math.floor(rngNext(state) * list.length)];
const spec = site => (site && SPECIALTIES[site.specialty]) || {};
const canPay = (state, cost) => Object.entries(cost).every(([r, v]) => (state.resources[r] || 0) >= v);
const pay = (state, cost) => { for (const [r, v] of Object.entries(cost)) state.resources[r] -= v; };

export function stationState(state, siteId) {
  const st = state.world.sites[siteId];
  if (st && typeof st.rep !== 'number') st.rep = 0;
  return st;
}

export function repLevel(st) {
  return Math.min(STATION.repMax, Math.floor((st.rep || 0) / STATION.repPerLevel));
}

function makeTrade(state, site, forcedTo) {
  const S = STATION;
  const to = forcedTo || pick(state, S.getRes);
  const from = pick(state, S.giveRes.filter(r => r !== to));
  const loot = getCircuit(state.route.ring).lootMult;
  const x = Math.round((S.giveRange[0] + rngNext(state) * (S.giveRange[1] - S.giveRange[0])) * loot);
  const rate = S.rate[0] + rngNext(state) * (S.rate[1] - S.rate[0]);
  let bonus = 0;
  const sp = spec(site);
  if (sp.toBonus && sp.toBonus[to]) bonus += sp.toBonus[to];
  if (forcedTo && sp.guaranteedBonus) bonus += sp.guaranteedBonus;
  return { from, x, to, y0: x * S.values[from] / S.values[to] * rate, bonus, done: false };
}

// Offres de la gare pour ce tour (tirées une seule fois)
export function stationVisit(state, site) {
  const st = stationState(state, site.id);
  if (!st) return null;
  const lap = state.route.lap;
  if (st.visit && st.visit.lap === lap) return st.visit;
  const sp = spec(site);
  const trades = [];
  if (sp.guaranteed) trades.push(makeTrade(state, site, sp.guaranteed));
  while (trades.length < (sp.trades || STATION.trades)) trades.push(makeTrade(state, site));
  const recruits = [];
  for (let i = 0; i < (sp.recruits || 1); i++) recruits.push(newRecruit(state));
  // Un objet d'équipement à vendre
  const shop = [];
  for (let i = 0; i < DEFENSE.stationItems; i++) {
    const type = randomShopItem(state);
    const d = itemDef(type);
    shop.push({ type, cost: { scrap: d.value, parts: d.tier }, sold: false });
  }
  st.visit = { lap, trades, recruits, shop, hired: false, keyBought: false, rumor: false };
  // Un contrat à la fois : nouvelle offre s'il n'y en a pas
  if (!st.contract) st.contract = newContract(state);
  return st.visit;
}

// Bonus de troc : Savoir du meilleur survivant, réputation, spécialité
export function tradeBonus(state, st) {
  const best = Math.max(0, ...state.crew.map(s => s.skills.sav || 0));
  return Math.min(STATION.savoirMax, STATION.savoirBonus * best) + STATION.repBonus * repLevel(st);
}

export function tradeGet(state, st, tr) {
  return Math.max(1, Math.round(tr.y0 * (1 + tradeBonus(state, st) + tr.bonus)));
}

function gainRep(state, st, n) {
  const before = repLevel(st);
  st.rep = (st.rep || 0) + n;
  if (repLevel(st) > before) bus.emit('station:rep', repLevel(st));
}

export function doTrade(state, site, i) {
  const st = stationState(state, site.id);
  const tr = st.visit && st.visit.trades[i];
  if (!tr || tr.done) return { ok: false };
  if ((state.resources[tr.from] || 0) < tr.x) return { ok: false, reason: 'cost' };
  const y = tradeGet(state, st, tr);
  state.resources[tr.from] -= tr.x;
  const cap = capacities(state)[tr.to] ?? Infinity;
  const before = state.resources[tr.to] || 0;
  state.resources[tr.to] = Math.min(cap, before + y);
  addGain(state, tr.to, state.resources[tr.to] - before);
  tr.done = true;
  gainRep(state, st, 1);
  return { ok: true, got: state.resources[tr.to] - before, lost: before + y - state.resources[tr.to] };
}

export function recruitCost(state) {
  return state.crew.length < STATION.freeRecruitBelow ? {} : STATION.recruitCost;
}

// Une recrue : parfois avec une arme ou une armure à elle
export function newRecruit(state) {
  const s = createSurvivor(state);
  if (rngNext(state) < RECRUIT_KIT.chance) s.kit = pick(state, RECRUIT_KIT.items);
  return s;
}

// Recrutement (gares et dépôt) : il faut un couchage libre
export function canHire(state, visit, free = false) {
  if (!visit || visit.hired) return { ok: false, reason: 'done' };
  if (state.crew.length >= bedsTotal(state)) return { ok: false, reason: 'beds' };
  if (!free && !canPay(state, recruitCost(state))) return { ok: false, reason: 'cost' };
  return { ok: true };
}

// Recrutement générique (gare, dépôt, camp allié : free = offerte)
export function hireFrom(state, visit, i, free = false) {
  const c = canHire(state, visit, free);
  if (!c.ok) return c;
  const s = visit.recruits[i];
  if (!s) return { ok: false };
  if (!free) pay(state, recruitCost(state));
  state.crew.push(s);
  // La recrue arrive avec ses affaires
  if (s.kit) {
    const it = addItem(state, s.kit);
    if (WEAPONS[s.kit]) s.weapon = it.id; else s.armor = it.id;
    delete s.kit;
  }
  visit.hired = true;
  bus.emit('crew:recruited', s);
  bus.emit('crew:changed');
  return { ok: true, s };
}

export function canRecruit(state, site) {
  return canHire(state, stationState(state, site.id).visit);
}

export function recruit(state, site, i) {
  const st = stationState(state, site.id);
  const r = hireFrom(state, st.visit, i);
  if (r.ok) gainRep(state, st, 1);
  return r;
}

// Dépôt : un volontaire se présente à chaque tour
export function depotVisit(state) {
  const w = state.world;
  const lap = state.route.lap;
  if (!w.depot || w.depot.lap !== lap) w.depot = { lap, recruits: [newRecruit(state)], hired: false };
  return w.depot;
}

export function recruitAtDepot(state, i) {
  if (state.route.mode !== 'depot') return { ok: false, reason: 'halte' };
  return hireFrom(state, depotVisit(state), i);
}

export function repairOffer(state, site) {
  const st = stationState(state, site.id);
  const sp = spec(site);
  const free = repLevel(st) >= STATION.repMax;
  const cost = free ? {} : { scrap: sp.repairScrap || STATION.repair.cost.scrap };
  const full = state.train.integrity >= maxIntegrity(state) - 0.5;
  return { cost, gain: STATION.repair.gain, full, ok: !full && canPay(state, cost) };
}

export function repairAt(state, site) {
  const o = repairOffer(state, site);
  if (!o.ok) return false;
  pay(state, o.cost);
  state.train.integrity = Math.min(maxIntegrity(state), state.train.integrity + o.gain);
  return true;
}

export function keyOffer(state, site) {
  const st = stationState(state, site.id);
  const done = !!(st.visit && st.visit.keyBought);
  const full = (state.resources.keys || 0) >= BALANCE.storage.keysCap;
  return { cost: STATION.key.cost, done, ok: !done && !full && canPay(state, STATION.key.cost) };
}

export function buyKey(state, site) {
  const o = keyOffer(state, site);
  if (!o.ok) return false;
  pay(state, o.cost);
  state.resources.keys = (state.resources.keys || 0) + 1;
  stationState(state, site.id).visit.keyBought = true;
  return true;
}

// Rumeur : révèle un embranchement inconnu, au choix du joueur
export function unknownBranches(state) {
  const out = [];
  getCircuit(state.route.ring).legs.forEach((leg, i) => leg.branches.forEach(b => {
    const bs = state.world.branches[b.id];
    if (bs && !bs.known) out.push({ b, leg: i });
  }));
  return out;
}

export function rumorOffer(state, site) {
  const st = stationState(state, site.id);
  const cost = spec(site).rumorHalf ? { parts: Math.ceil(STATION.rumor.cost.parts / 2) } : STATION.rumor.cost;
  const done = !!(st.visit && st.visit.rumor);
  return { cost, done, any: unknownBranches(state).length > 0, ok: !done && canPay(state, cost) && unknownBranches(state).length > 0 };
}

export function buyRumor(state, site, branchId) {
  const o = rumorOffer(state, site);
  if (!o.ok) return false;
  const target = unknownBranches(state).find(u => u.b.id === branchId);
  if (!target) return false;
  pay(state, o.cost);
  markBranchKnown(state, branchId);
  for (const s of target.b.sites) markSeen(state, s.id);
  stationState(state, site.id).visit.rumor = true;
  return true;
}

export function buyShopItem(state, site, i) {
  const st = stationState(state, site.id);
  const o = st.visit && st.visit.shop && st.visit.shop[i];
  if (!o || o.sold || !canPay(state, o.cost)) return null;
  pay(state, o.cost);
  o.sold = true;
  gainRep(state, st, 1);
  return addItem(state, o.type);
}

// ---------- Contrats (GDD §8.4) ----------
function newContract(state) {
  const C = STATION.contract;
  const res = pick(state, C.res);
  const loot = getCircuit(state.route.ring).lootMult;
  const qty = Math.round((C.qty[0] + rngNext(state) * (C.qty[1] - C.qty[0])) * loot / 10) * 10;
  const laps = C.laps[0] + Math.floor(rngNext(state) * (C.laps[1] - C.laps[0] + 1));
  return { res, qty, laps, delivered: 0, accepted: false, acceptLap: null, deadline: null };
}

// Récompense : Pièces = 0,4 × quantité × valeur de la ressource
export const contractReward = c => Math.round(STATION.contract.partsPerValue * c.qty * STATION.values[c.res]);

export function acceptContract(state, site) {
  const st = stationState(state, site.id);
  const c = st && st.contract;
  if (!c || c.accepted) return { ok: false };
  c.accepted = true;
  c.acceptLap = state.route.lap;
  c.deadline = state.route.lap + c.laps;      // dernier tour pour livrer
  bus.emit('contract:accepted', { site, c });
  return { ok: true };
}

// On livre en repassant : pas pendant le passage où l'on a accepté
export function canDeliver(state, site) {
  const st = stationState(state, site.id);
  const c = st && st.contract;
  if (!c || !c.accepted) return { ok: false, reason: 'none' };
  if (state.route.lap <= c.acceptLap) return { ok: false, reason: 'later' };
  const n = Math.min(c.qty - c.delivered, Math.floor(state.resources[c.res] || 0));
  if (n <= 0) return { ok: false, reason: 'cost', n: 0 };
  return { ok: true, n };
}

export function deliver(state, site) {
  const d = canDeliver(state, site);
  if (!d.ok) return d;
  const st = stationState(state, site.id);
  const c = st.contract;
  state.resources[c.res] -= d.n;
  c.delivered += d.n;
  if (c.delivered < c.qty) return { ok: true, n: d.n, done: false };
  // Contrat rempli
  const parts = contractReward(c);
  const cap = capacities(state).parts ?? Infinity;
  const before = state.resources.parts || 0;
  state.resources.parts = Math.min(cap, before + parts);
  addGain(state, 'parts', state.resources.parts - before);
  gainRep(state, st, STATION.contract.rep);
  let key = false;
  if (rngNext(state) < STATION.contract.keyChance && (state.resources.keys || 0) < BALANCE.storage.keysCap) {
    state.resources.keys = (state.resources.keys || 0) + 1;
    if (state.route.lapStats) state.route.lapStats.keys += 1;
    key = true;
  }
  st.contract = null;
  bus.emit('contract:done', { site, parts, key });
  return { ok: true, n: d.n, done: true, parts, key };
}

// Tick du monde : les contrats acceptés dont le délai est passé échouent (−4 de réputation)
export function contractTick(state, ring) {
  const news = [];
  const lap = state.route.lap;
  for (const leg of getCircuit(ring).legs) for (const b of leg.branches) for (const site of b.sites) {
    if (site.type !== 'station') continue;
    const st = state.world.sites[site.id];
    const c = st && st.contract;
    if (!c || !c.accepted || lap < c.deadline) continue;
    st.rep = Math.max(0, (st.rep || 0) - STATION.contract.rep);
    st.contract = null;
    news.push({ key: 'news.contractFailed', site: site.name });
  }
  return news;
}

// Tous les contrats acceptés (carnet, carte)
export function activeContracts(state) {
  const out = [];
  for (const leg of getCircuit(state.route.ring).legs) for (const b of leg.branches) for (const site of b.sites) {
    const st = state.world.sites[site.id];
    if (site.type === 'station' && st && st.contract && st.contract.accepted) {
      out.push({ site, c: st.contract, lapsLeft: st.contract.deadline - state.route.lap });
    }
  }
  return out;
}

export function stationSite(state) {
  const r = state.route;
  if (r.mode !== 'stop' || !r.stop || r.stop.action !== 'halt') return null;
  return findSite(r.ring, r.stop.site);
}
