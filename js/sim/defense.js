// Défense du train par l'équipage : tout survivant valide présent dans un wagon se bat avec son arme
// contre les ennemis à sa portée ; les défenseurs d'un wagon attaqué encaissent une partie des coups,
// réduite par leur armure. Les renforts glissés sur un wagon attaqué retournent au repos quand c'est calme.
import { DEFENSE } from '../data/items.js';
import { COMBAT } from '../data/enemies.js';
import { restingPlaces, canWork, efficiency, addXp } from './crew.js';
import { weaponOf, armorOf } from './equipment.js';
import { hurt, statsOf, enemyArmor } from './combat.js';
import { fx } from './research.js';
import { bus } from '../core/bus.js';
import { caboose, carById } from './caboose.js';

// Index du wagon où se trouve chaque survivant (−1 = cabine de la locomotive)
export function crewPositions(state) {
  const idx = new Map(state.train.wagons.map((w, i) => [w.id, i]));
  if (caboose(state)) idx.set('caboose', state.train.wagons.length);     // fourgon de queue : position n
  const pos = new Map();
  for (const s of state.crew) if (s.post && idx.has(s.post.wagon)) pos.set(s.id, idx.get(s.post.wagon));
  for (const r of restingPlaces(state)) {
    if (!r.place) continue;
    pos.set(r.s.id, r.place.wagon === 'loco' ? -1 : idx.get(r.place.wagon));
  }
  return pos;
}

// Se bat : tout survivant présent dans un wagon attaqué, même blessé (seul un survivant à terre ne se bat plus)
export const canFight = s => s.state !== 'critical' && s.hp > 0;
// Part en renfort (garde automatique) : seulement en forme
const fitForGuard = s => canWork(s) && s.hp >= DEFENSE.minHp;

export function defendersAt(state, pos, i) {
  return state.crew.filter(s => canFight(s) && pos.get(s.id) === i);
}

// Coups d'un ennemi sur le wagon i : une part pour les défenseurs, le reste pour l'intégrité
export function absorb(state, pos, i, dmg) {
  const defs = defendersAt(state, pos, i);
  if (!defs.length) return dmg;
  const each = dmg * DEFENSE.share / defs.length;
  for (const s of defs) s.hp -= each * (1 - armorOf(state, s));
  return dmg * (1 - DEFENSE.share);
}

const attachedOn = (c, i) => c.enemies.some(e => e.phase === 'attached' && e.wagon === i);

// Alerte : un wagon attaqué sans défenseur reçoit le meilleur combattant au repos (la « garde »)
function callGuards(state, pos) {
  const wagons = state.train.wagons;
  const cb = caboose(state);
  const all = cb ? [...wagons, cb] : wagons;
  all.forEach((w, i) => {
    if (!w.attacked || defendersAt(state, pos, i).length) return;
    const power = s => efficiency(s, 'com') * weaponOf(state, s).dps;
    let guards = state.crew.filter(s => !s.post && fitForGuard(s));
    if (!guards.length) {
      // Personne au repos : le travailleur le plus proche quitte son poste (pas la Chaudière si on peut l'éviter),
      // il y retournera quand ce sera calme
      guards = state.crew.filter(s => s.post && typeof s.post.slot === 'number' && fitForGuard(s) &&
        pos.has(s.id) && all[pos.get(s.id)] && !all[pos.get(s.id)].attacked);
      const cost = s => Math.abs(pos.get(s.id) - i) * 10 + (all[pos.get(s.id)].type === 'boiler' ? 25 : 0) - power(s) / 10;
      guards.sort((a, b) => cost(a) - cost(b));
    } else guards.sort((a, b) => power(b) - power(a));
    if (!guards.length) return;
    if (sendToDefend(state, guards[0], w)) { pos.set(guards[0].id, i); bus.emit('combat:guard', { s: guards[0], w }); }
  });
}

export function updateDefenders(state, pos, dt) {
  const c = state.combat;
  callGuards(state, pos);
  const res = state.resources;
  const B = c.barrage && c.barrage.left > 0 ? COMBAT.abilities.barrage : null;
  for (const s of state.crew) {
    const i = pos.get(s.id);
    if (i === undefined) continue;
    // Renfort : retour au repos après quelques secondes de calme
    if (s.post && s.post.slot === 'defend') {
      if (attachedOn(c, i)) s.calmT = 0;
      else if ((s.calmT = (s.calmT || 0) + dt) >= DEFENSE.calmSec) {
        // Retour au poste d'avant s'il est toujours libre, sinon au repos
        const back = s.returnPost;
        const free = back && carById(state, back.wagon) &&
          !state.crew.some(o => o !== s && o.post && o.post.wagon === back.wagon && o.post.slot === back.slot);
        s.post = free && canWork(s) ? back : null;
        s.state = s.post ? 'working' : canWork(s) ? 'idle' : s.state;
        s.returnPost = null;
        s.calmT = 0;
        bus.emit('crew:changed');
        continue;
      }
    }
    if (!canFight(s)) continue;
    const W = weaponOf(state, s);
    const cands = c.enemies.filter(e => Math.abs(e.wagon - i) <= W.range &&
      (e.phase === 'attached' || (W.range > 0 && e.phase === 'approach' && e.t >= e.arrive * COMBAT.inRangeFrom)));
    if (!cands.length) continue;
    const tgt = cands.find(e => e.id === c.target)
      || cands.filter(e => e.wagon === i).sort((a, b) => a.hp - b.hp)[0]
      || cands.reduce((a, b) => (b.hp < a.hp ? b : a));
    let loaded = true;
    if (W.ammo) {
      loaded = res.ammo > 0;
      if (loaded) res.ammo = Math.max(0, res.ammo - W.ammo * (B ? B.ammo : 1) * dt);
    }
    const dmg = W.dps * efficiency(s, 'com') * (loaded ? 1 : DEFENSE.noAmmoFactor) * (B ? B.dmg : 1) * (1 - enemyArmor(state, tgt)) * (1 + fx(state, 'damage')) * dt;
    hurt(state, tgt, dmg, -1, s.id);
    bus.emit('combat:fire', W.range > 0 ? 'gun' : 'melee');
    s.fightT = state.time;
    s.fightClock = (s.fightClock || 0) + dt;
    if (s.fightClock >= DEFENSE.xpEverySec) { s.fightClock -= DEFENSE.xpEverySec; addXp(state, s, 'com', 1); }
  }
}

// Envoie un survivant défendre un wagon attaqué (place « renfort »)
export function sendToDefend(state, s, w) {
  if (!canWork(s) || !w.attacked) return false;
  if (s.post && typeof s.post.slot === 'number') s.returnPost = s.post;
  else if (!s.post) s.returnPost = null;
  s.post = { wagon: w.id, slot: 'defend' };
  s.state = 'working';
  s.calmT = 0;
  bus.emit('crew:changed');
  return true;
}
