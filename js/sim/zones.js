// Progression entre les zones : zone la plus avancée, plafonds, butin des boss, équipement de zone,
// traque (la menace monte tant que le boss de la zone vit) et entretien du convoi.
import { ZONES, ZONE_KITS, zoneOf } from '../data/zones.js';
import { PROGRESS } from '../data/balance.js';
import { WAGONS } from '../data/wagons.js';
import { bus } from '../core/bus.js';

export function progress(state) {
  if (!state.progress) state.progress = { zone: 1, kit: null, materials: {}, bossDown: {}, zoneSince: { 1: 1 } };
  const p = state.progress;
  p.materials = p.materials || {};
  p.bossDown = p.bossDown || {};
  p.zoneSince = p.zoneSince || { 1: 1 };
  return p;
}

export const zoneMax = state => progress(state).zone;
export const levelCap = state => zoneOf(zoneMax(state)).levelCap;
export const bossDown = (state, ring) => !!progress(state).bossDown[ring];

// ---------- Butin du boss ----------
// Première victoire sur la forteresse de la zone : son matériau (une seule fois)
export function onBossDefeated(state, ring) {
  const p = progress(state);
  if (p.bossDown[ring]) return null;
  p.bossDown[ring] = state.route.lap;
  const loot = zoneOf(ring).bossLoot;
  if (loot) p.materials[loot] = (p.materials[loot] || 0) + 1;
  bus.emit('zone:bossDown', { ring, loot });
  return loot;
}

// ---------- Équipement de zone (atelier de la traverse) ----------
export function kitFor(ring) {
  const id = zoneOf(ring).kit;
  return id ? { id, ...ZONE_KITS[id] } : null;
}

export function canCraftKit(state, ring) {
  const k = kitFor(ring);
  if (!k) return { ok: false, reason: 'none' };
  if (!ZONES[k.opens] || !ZONES[k.opens].ready) return { ok: false, reason: 'soon' };
  const p = progress(state);
  if (p.kit === k.id) return { ok: false, reason: 'done' };
  const { material, ...res } = k.cost;
  if (!(p.materials[material] > 0)) return { ok: false, reason: 'material' };
  for (const [r, v] of Object.entries(res)) if ((state.resources[r] || 0) < v) return { ok: false, reason: 'cost' };
  return { ok: true };
}

export function craftKit(state, ring) {
  const c = canCraftKit(state, ring);
  if (!c.ok) return c;
  const k = kitFor(ring);
  const { material, ...res } = k.cost;
  for (const [r, v] of Object.entries(res)) state.resources[r] -= v;
  progress(state).materials[material] -= 1;
  progress(state).kit = k.id;
  bus.emit('zone:kit', k.id);
  return { ok: true, kit: k.id };
}

// La traverse vers la zone suivante est-elle praticable ?
export function traverseState(state, toRing) {
  const z = ZONES[toRing];
  if (!z) return 'none';
  if (!z.ready) return 'soon';
  const k = Object.values(ZONE_KITS).find(x => x.opens === toRing);
  if (k && progress(state).kit !== Object.keys(ZONE_KITS).find(id => ZONE_KITS[id] === k)) return 'kit';
  return 'open';
}

// ---------- Traque ----------
// Tant que le boss de la zone vit, la menace monte d'un cran par tour passé dans la zone (après un délai de grâce)
export function huntLevel(state) {
  const ring = state.route.ring;
  if (bossDown(state, ring)) return 0;
  const p = progress(state);
  const since = p.zoneSince[ring] || 1;
  const laps = state.route.lap - since;
  const relief = (p.huntRelief && p.huntRelief[ring]) || 0;
  return Math.max(0, Math.min(PROGRESS.huntMax, laps - PROGRESS.huntGrace + 1 - relief));
}
// Déraillement : les bandes perdent la trace du convoi (la traque recule), pour ne pas enfermer le joueur
export function easeHunt(state, n) {
  const p = progress(state);
  const lv = huntLevel(state);
  if (lv <= 0) return 0;
  p.huntRelief = p.huntRelief || {};
  const k = Math.min(n, lv);
  p.huntRelief[state.route.ring] = (p.huntRelief[state.route.ring] || 0) + k;
  return k;
}
// Avant-poste du Roi pillé : ses bandes perdent la trace, la traque repart de zéro (puis remonte d'un cran par tour)
export function resetHunt(state) {
  const lv = huntLevel(state);
  return lv > 0 ? easeHunt(state, lv) : 0;
}
export const huntMult = state => 1 + PROGRESS.huntStep * huntLevel(state);

// ---------- Entretien du convoi (au dépôt) ----------
export function upkeepCost(state) {
  const cost = { scrap: 0, parts: 0 };
  for (const w of state.train.wagons) {
    const u = PROGRESS.upkeep[w.level - 1] || PROGRESS.upkeep[0];
    cost.scrap += u.scrap;
    cost.parts += u.parts;
  }
  return cost;
}

// Payé à l'arrivée au dépôt ; ce qui manque abîme le convoi (intégrité) et le moral
export function payUpkeep(state) {
  const cost = upkeepCost(state);
  const paid = {}, missing = {};
  for (const [r, v] of Object.entries(cost)) {
    const p = Math.min(v, Math.max(0, state.resources[r] || 0));
    state.resources[r] -= p;
    paid[r] = p;
    if (v - p > 0.01) missing[r] = v - p;
  }
  const short = (missing.scrap || 0) + (missing.parts || 0) * PROGRESS.upkeepPartsWorth;
  if (short > 0) {
    state.train.integrity = Math.max(1, state.train.integrity - short * PROGRESS.upkeepShortDamage);
    for (const s of state.crew) s.morale = Math.max(0, s.morale - PROGRESS.upkeepShortMorale);
  }
  return { cost, paid, missing, short };
}

export { WAGONS };
