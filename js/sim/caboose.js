// Fourgon de queue blindé (idée du manager) : une extension toujours accrochée derrière le dernier wagon.
// Pour le combat, c'est la position n (n = nombre de wagons) : les assauts y montent et doivent l'enfoncer
// avant d'entrer dans le train. Ses postes de garde accueillent des survivants qui tiennent la porte.
import { levelCap } from './zones.js';
import { BUILD } from '../data/build.js';
import { COMBAT } from '../data/enemies.js';
import { isHalte } from './route.js';
import { bus } from '../core/bus.js';

const C = () => BUILD.caboose;
const canPay = (state, cost) => Object.entries(cost).every(([r, v]) => (state.resources[r] || 0) >= v);
const pay = (state, cost) => { for (const [r, v] of Object.entries(cost)) state.resources[r] -= v; };

export const caboose = state => state.train.caboose || null;
export const cabooseIndex = state => state.train.wagons.length;
export const cabooseMax = cb => C().hp[cb.level - 1];
// La porte tient tant qu'elle n'a pas été enfoncée (puis réparée à 25 %)
export const doorHolds = state => { const cb = caboose(state); return !!cb && !cb.breached; };

// Un « wagon » par son identifiant, fourgon compris
export function carById(state, id) {
  if (id === 'caboose') return caboose(state);
  return state.train.wagons.find(w => w.id === id) || null;
}

// ---------- Construction, amélioration, réparation (en Halte) ----------
export function canBuildCaboose(state) {
  if (caboose(state)) return { ok: false, reason: 'done' };
  if (!isHalte(state)) return { ok: false, reason: 'halte' };
  if (!canPay(state, C().cost)) return { ok: false, reason: 'cost' };
  return { ok: true };
}

export function buildCaboose(state) {
  const c = canBuildCaboose(state);
  if (!c.ok) return c;
  pay(state, C().cost);
  state.train.caboose = { id: 'caboose', type: 'caboose', level: 1, hp: C().hp[0], breached: false };
  bus.emit('train:built', state.train.caboose);
  bus.emit('crew:changed');
  return { ok: true };
}

export function cabooseUpCost(state) {
  const cb = caboose(state);
  return cb ? C().up[cb.level + 1] || null : null;
}

export function canUpgradeCaboose(state) {
  const cb = caboose(state);
  const cost = cabooseUpCost(state);
  if (!cb || !cost) return { ok: false, reason: 'max' };
  if (cb.level + 1 > levelCap(state)) return { ok: false, reason: 'zoneCap' };
  if (!isHalte(state)) return { ok: false, reason: 'halte' };
  if (!canPay(state, cost)) return { ok: false, reason: 'cost' };
  return { ok: true };
}

export function upgradeCaboose(state) {
  const c = canUpgradeCaboose(state);
  if (!c.ok) return c;
  const cb = caboose(state);
  pay(state, cabooseUpCost(state));
  const gain = C().hp[cb.level] - C().hp[cb.level - 1];
  cb.level += 1;
  cb.hp += gain;
  if (cb.hp >= cabooseMax(cb) * C().holdAt) cb.breached = false;
  bus.emit('crew:changed');
  return { ok: true };
}

export function cabooseRepairCost(state) {
  const cb = caboose(state);
  if (!cb) return null;
  const missing = cabooseMax(cb) - cb.hp;
  return missing < 1 ? null : { scrap: Math.ceil(missing * C().repairScrapPerHp) };
}

export function canRepairCaboose(state) {
  const cost = cabooseRepairCost(state);
  if (!cost) return { ok: false, reason: 'full' };
  if (!isHalte(state)) return { ok: false, reason: 'halte' };
  if (!canPay(state, cost)) return { ok: false, reason: 'cost' };
  return { ok: true };
}

export function repairCaboose(state) {
  const c = canRepairCaboose(state);
  if (!c.ok) return c;
  pay(state, cabooseRepairCost(state));
  const cb = caboose(state);
  cb.hp = cabooseMax(cb);
  cb.breached = false;
  return { ok: true };
}

// ---------- Combat ----------
// Coups portés à la porte ; renvoie ce qui n'a pas été encaissé (porte déjà enfoncée)
export function hitCaboose(state, dmg) {
  const cb = caboose(state);
  if (!cb || cb.breached) return dmg;
  cb.hp = Math.max(0, cb.hp - dmg);
  if (cb.hp <= 0) {
    cb.breached = true;
    bus.emit('combat:breach', cb);
  }
  return 0;
}

// Réparation lente hors combat (mêmes mécaniciens que l'intégrité)
export function regenCaboose(state, rate, dt) {
  const cb = caboose(state);
  if (!cb || cb.attacked) return;
  const max = cabooseMax(cb);
  if (cb.hp >= max) return;
  cb.hp = Math.min(max, cb.hp + rate * dt);
  if (cb.breached && cb.hp >= max * C().holdAt) {
    cb.breached = false;
    bus.emit('combat:doorFixed', cb);
  }
}

// Dépôt : l'atelier du dépôt remet la porte en état (à moitié après un déraillement)
export function depotCaboose(state, derailed) {
  const cb = caboose(state);
  if (!cb) return;
  const max = cabooseMax(cb);
  cb.hp = derailed ? Math.max(cb.hp, max * 0.5) : Math.min(max, cb.hp + max * COMBAT.depotRepair * 2);
  if (cb.hp >= max * C().holdAt) cb.breached = false;
  cb.attacked = false;
}
