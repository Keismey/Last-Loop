// Construction du train (GDD §4.2, §4.3, §4.7) : nouveaux wagons, niveaux, Greniers, ordre du convoi,
// nouvelle locomotive. Tout se fait en Halte (dépôt ou gare), sauf le Grenier qui s'achète à tout moment.
import { BUILD } from '../data/build.js';
import { WAGONS } from '../data/wagons.js';
import { SPECIALTIES } from '../data/stations.js';
import { findSite } from '../data/circuits.js';
import { isHalte } from './route.js';
import { maxIntegrity } from './combat.js';
import { bus } from '../core/bus.js';
import { capacities } from '../core/state.js';
import { bedCount } from '../data/wagons.js';
import { BALANCE } from '../data/balance.js';
import { levelCap, zoneMax } from './zones.js';

export const canAfford = (state, cost) => Object.entries(cost).every(([r, v]) => (state.resources[r] || 0) >= v);
function pay(state, cost) {
  for (const [r, v] of Object.entries(cost)) state.resources[r] -= v;
}
const scale = (cost, k) => Object.fromEntries(Object.entries(cost).map(([r, v]) => [r, Math.round(v * k)]));

// Gare spécialisée « Forge » : améliorations et Greniers −15 % pendant l'arrêt
function forgeDiscount(state) {
  const r = state.route;
  if (r.mode !== 'stop' || !r.stop || r.stop.action !== 'halt') return 1;
  const site = findSite(r.ring, r.stop.site);
  return site && site.specialty === 'forge' ? 1 - SPECIALTIES.forge.discount : 1;
}

export const traction = state => BUILD.locos[state.train.loco].traction;
const research = (state, id) => !!(state.research && state.research[id]);

// Le type est-il débloqué ? Renvoie null si oui, sinon la raison (clé de texte + valeur)
export function lockReason(state, type) {
  const u = BUILD.unlock[type];
  if (!u) return null;
  if (u.laps && (state.stats.laps || 0) < u.laps) return { key: 'build.needLaps', n: u.laps };
  if (u.loco && state.train.loco < u.loco) return { key: 'build.needLoco', n: u.loco };
  if (u.research && !research(state, u.research)) return { key: 'build.needResearchName', id: u.research };
  return null;
}

export function buildCost(state, type) {
  const n = state.train.wagons.filter(w => w.type === type).length;
  return scale(BUILD.cost[type], Math.pow(BUILD.growth, n));
}

export function upgradeCost(state, w) {
  if (w.level >= BUILD.maxLevel) return null;
  return scale(BUILD.cost[w.type], BUILD.levelMult[w.level + 1] * forgeDiscount(state));
}

export function atticCost(state) {
  return scale(BUILD.attic.cost, forgeDiscount(state));
}

// Vérifications communes ; renvoie { ok, reason }
function check(state, cost, needHalte = true) {
  if (needHalte && !isHalte(state)) return { ok: false, reason: 'halte' };
  if (!canAfford(state, cost)) return { ok: false, reason: 'cost' };
  return { ok: true };
}

export const isUnique = type => BUILD.unique.includes(type);
export const hasRoof = w => !BUILD.noRoof.includes(w.type);

export function canBuild(state, type) {
  if (lockReason(state, type)) return { ok: false, reason: 'locked' };
  if (isUnique(type) && state.train.wagons.some(w => w.type === type)) return { ok: false, reason: 'unique' };
  if (state.train.wagons.length >= traction(state)) return { ok: false, reason: 'traction' };
  return check(state, buildCost(state, type));
}

export function buildWagon(state, type) {
  const c = canBuild(state, type);
  if (!c.ok) return c;
  const cost = buildCost(state, type);
  pay(state, cost);
  const ids = state.train.wagons.map(w => parseInt(w.id.slice(1), 10) || 0);
  const w = { id: 'w' + (Math.max(0, ...ids) + 1), type, level: 1, broken: false };
  if (type === 'workshop') w.recipe = 'parts';
  // La Chaudière se place toujours juste derrière la locomotive
  if (type === BUILD.fixedFront) state.train.wagons.unshift(w); else state.train.wagons.push(w);
  state.train.integrity += 10;     // le nouveau wagon ajoute 10 d'intégrité max, accordés tout de suite
  bus.emit('train:built', w);
  bus.emit('crew:changed');
  return { ok: true, wagon: w };
}

export function canUpgrade(state, w) {
  if (w.level >= BUILD.maxLevel) return { ok: false, reason: 'max' };
  if (w.level + 1 > levelCap(state)) return { ok: false, reason: 'zoneCap' };
  return check(state, upgradeCost(state, w));
}

export function upgradeWagon(state, w) {
  const c = canUpgrade(state, w);
  if (!c.ok) return c;
  pay(state, upgradeCost(state, w));
  w.level += 1;
  state.train.integrity += 10;
  bus.emit('train:upgraded', w);
  bus.emit('crew:changed');
  return { ok: true };
}

export function canAttic(state, w) {
  if (!hasRoof(w)) return { ok: false, reason: 'noRoof' };
  if (w.attic) return { ok: false, reason: 'done' };
  if (roofModule(w)) return { ok: false, reason: 'roof' };
  return check(state, atticCost(state), false);
}

export function buyAttic(state, w) {
  const c = canAttic(state, w);
  if (!c.ok) return c;
  pay(state, atticCost(state));
  w.attic = true;
  bus.emit('train:attic', w);
  return { ok: true };
}

// Un seul module de toit par wagon : Grenier, Couchettes ou Tourelle auto
export const roofModule = w => (w.attic ? 'attic' : w.berths ? 'berths' : w.roofTurret ? 'roofTurret' : null);

// Tourelle auto sur le toit : débloquée par la recherche, 3 au plus
export function roofTurretCost(state) {
  return scale(BUILD.roofTurret.cost, forgeDiscount(state));
}
export const roofTurretCount = state => state.train.wagons.filter(w => w.roofTurret).length;

export function canRoofTurret(state, w) {
  if (!research(state, BUILD.roofTurret.research)) return { ok: false, reason: 'research' };
  if (!hasRoof(w)) return { ok: false, reason: 'noRoof' };
  if (roofModule(w)) return { ok: false, reason: 'roof' };
  if (roofTurretCount(state) >= BUILD.roofTurret.max) return { ok: false, reason: 'max' };
  return check(state, roofTurretCost(state), false);
}

export function buyRoofTurret(state, w) {
  const c = canRoofTurret(state, w);
  if (!c.ok) return c;
  pay(state, roofTurretCost(state));
  w.roofTurret = true;
  bus.emit('train:roof', w);
  return { ok: true };
}

// Couchettes sur le toit (2 lits) : en Halte, à la place d'un Grenier
export function berthsCost(state) {
  return scale(BUILD.berths.cost, forgeDiscount(state));
}

export function canBerths(state, w) {
  if (!hasRoof(w)) return { ok: false, reason: 'noRoof' };
  if (w.berths) return { ok: false, reason: 'done' };
  if (roofModule(w)) return { ok: false, reason: 'roof' };
  return check(state, berthsCost(state));
}

export function buyBerths(state, w) {
  const c = canBerths(state, w);
  if (!c.ok) return c;
  pay(state, berthsCost(state));
  w.berths = true;
  bus.emit('train:berths', w);
  bus.emit('crew:changed');
  return { ok: true };
}

// Change la place d'un wagon dans le convoi (dir = −1 vers la locomotive, +1 vers la queue)
export function moveWagon(state, w, dir) {
  if (!isHalte(state)) return { ok: false, reason: 'halte' };
  const ws = state.train.wagons;
  const i = ws.indexOf(w), j = i + dir;
  if (i < 0 || j < 0 || j >= ws.length) return { ok: false };
  // La Chaudière ne bouge pas, et rien ne prend sa place
  if (w.type === BUILD.fixedFront || ws[j].type === BUILD.fixedFront) return { ok: false, reason: 'fixed' };
  [ws[i], ws[j]] = [ws[j], ws[i]];
  bus.emit('train:moved', w);
  return { ok: true };
}

export function canMoveWagon(state, w, dir) {
  const ws = state.train.wagons, i = ws.indexOf(w), j = i + dir;
  return i >= 0 && j >= 0 && j < ws.length && w.type !== BUILD.fixedFront && ws[j].type !== BUILD.fixedFront;
}

// ---------- Démantèlement ----------
// Remboursement : la moitié du coût de base, de chaque niveau payé, et du module de toit
function addCost(acc, cost, k = 1) {
  for (const [r, v] of Object.entries(cost)) acc[r] = (acc[r] || 0) + v * k;
  return acc;
}
const half = cost => Object.fromEntries(Object.entries(cost).map(([r, v]) => [r, Math.floor(v * BUILD.refund)]).filter(([, v]) => v > 0));

export function dismantleRefund(w) {
  const acc = addCost({}, BUILD.cost[w.type] || {});
  for (let l = 2; l <= w.level; l++) addCost(acc, BUILD.cost[w.type] || {}, BUILD.levelMult[l]);
  if (w.attic) addCost(acc, BUILD.attic.cost);
  if (w.berths) addCost(acc, BUILD.berths.cost);
  if (w.roofTurret) addCost(acc, BUILD.roofTurret.cost);
  return half(acc);
}
export const roofRefund = w => half(roofModule(w) ? BUILD[roofModule(w)].cost : {});

// Lits restants si on retire n couchages
const bedsAfter = (state, lost) => state.train.wagons.reduce((n, x) => n + bedCount(x), 0) + BALANCE.crew.cabinBeds - lost;

export function canDismantle(state, w) {
  if (!w || w.type === BUILD.fixedFront) return { ok: false, reason: 'fixed' };
  if (!isHalte(state)) return { ok: false, reason: 'halte' };
  if (state.combat && state.combat.enemies && state.combat.enemies.length) return { ok: false, reason: 'combat' };
  if (state.crew.length > bedsAfter(state, bedCount(w))) return { ok: false, reason: 'beds' };
  return { ok: true };
}

// Après une perte de stockage, ce qui dépasse la nouvelle capacité est perdu (au plus la place retirée)
function clampToCaps(state, before) {
  const caps = capacities(state);
  for (const [r, c] of Object.entries(caps)) {
    const lostRoom = Math.max(0, (before[r] ?? c) - c);
    if (state.resources[r] > c) state.resources[r] = Math.max(c, state.resources[r] - lostRoom);
  }
}

export function dismantleWagon(state, w) {
  const c = canDismantle(state, w);
  if (!c.ok) return c;
  const refund = dismantleRefund(w);
  const before = capacities(state);
  // L'équipage du wagon retourne au repos
  for (const s of state.crew) if (s.post && s.post.wagon === w.id) { s.post = null; s.state = s.state === 'working' ? 'idle' : s.state; }
  state.train.wagons.splice(state.train.wagons.indexOf(w), 1);
  clampToCaps(state, before);
  addCost(state.resources, refund);
  state.train.integrity = Math.min(state.train.integrity, maxIntegrity(state));
  bus.emit('train:dismantled', w);
  bus.emit('crew:changed');
  return { ok: true, refund };
}

export function canDismantleRoof(state, w) {
  if (!w || !roofModule(w)) return { ok: false, reason: 'none' };
  if (!isHalte(state)) return { ok: false, reason: 'halte' };
  if (w.berths && state.crew.length > bedsAfter(state, BUILD.berths.beds)) return { ok: false, reason: 'beds' };
  return { ok: true };
}

export function dismantleRoof(state, w) {
  const c = canDismantleRoof(state, w);
  if (!c.ok) return c;
  const refund = roofRefund(w);
  const before = capacities(state);
  w.attic = false;
  w.berths = false;
  w.roofTurret = false;
  clampToCaps(state, before);
  addCost(state.resources, refund);
  bus.emit('train:roof', w);
  bus.emit('crew:changed');
  return { ok: true, refund };
}

export function nextLoco(state) {
  return state.train.loco < BUILD.maxLoco ? BUILD.locos[state.train.loco + 1] || null : null;
}

export function canUpgradeLoco(state) {
  const L = nextLoco(state);
  if (!L) return { ok: false, reason: 'max' };
  if (L.zone > zoneMax(state)) return { ok: false, reason: 'zone' };
  if (L.research && !research(state, L.research)) return { ok: false, reason: 'research' };
  return check(state, L.cost);
}

export function upgradeLoco(state) {
  const c = canUpgradeLoco(state);
  if (!c.ok) return c;
  const before = maxIntegrity(state);
  pay(state, nextLoco(state).cost);
  state.train.loco += 1;
  state.train.integrity += maxIntegrity(state) - before;
  bus.emit('train:loco', state.train.loco);
  return { ok: true };
}

// Recette de l'Atelier : Pièces ou Munitions (GDD §4.3)
export function setRecipe(state, w, recipe) {
  if (w.type !== 'workshop') return;
  w.recipe = recipe;
}

export { WAGONS };
