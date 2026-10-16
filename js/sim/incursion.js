// Déplacement des ennemis à bord (idée du manager, à la Fallout Shelter) :
//  - errants (« infestation ») : montent sur un wagon au hasard, puis se répandent aux wagons voisins
//    s'ils ne sont pas éliminés assez vite (comme les radcafards) ;
//  - assauts (camps hostiles, forteresse, boss) : montent par l'arrière (le dernier wagon est la « porte »),
//    puis avancent d'un wagon vers la locomotive dès que le wagon où ils sont n'a plus de défenseur debout.
//    Avec un fourgon de queue blindé, ils montent sur le fourgon (position n) et doivent d'abord l'enfoncer ;
//    les ennemis volants (drones), eux, passent par-dessus.
import { COMBAT } from '../data/enemies.js';
import { rngNext } from '../core/rng.js';
import { bus } from '../core/bus.js';
import { defendersAt } from './defense.js';
import { caboose, doorHolds } from './caboose.js';

const ASSAULT_KINDS = new Set(['camp', 'warning', 'reinforce', 'fortress', 'boss', 'raid']);
export const isAssault = kind => ASSAULT_KINDS.has(kind);

// Wagon d'arrivée d'un ennemi d'une vague (stats : fiche de l'ennemi, pour savoir s'il vole)
export function entryWagon(state, wave, stats = {}) {
  const n = state.train.wagons.length;
  if (!wave || isAssault(wave.kind)) return caboose(state) && !stats.fly ? n : n - 1;
  if (wave.entry === undefined || wave.entry >= n) wave.entry = Math.floor(rngNext(state) * n);
  return wave.entry;
}

function moveTo(e, i) {
  e.moveFrom = e.wagon;
  e.moveT = 0;
  e.wagon = i;
}

export function updateIncursions(state, pos, dt) {
  const c = state.combat;
  const n = state.train.wagons.length;
  const I = COMBAT.incursion;
  for (const e of c.enemies) {
    if (e.moveT !== undefined && e.moveT < 1) e.moveT = Math.min(1, e.moveT + dt / I.moveSec);
    if (e.phase !== 'attached' || e.boss) continue;
    const wave = c.waves[e.wave];
    if (e.mode === 'assault') {
      // Avance vers la locomotive quand plus personne ne lui tient tête
      // Au fourgon : tant que la porte tient, on cogne dessus
      const atDoor = e.wagon >= n;
      if (e.wagon > 0 && !(atDoor && doorHolds(state)) && !defendersAt(state, pos, e.wagon).length) {
        e.advanceT = (e.advanceT || 0) + dt;
        if (e.advanceT >= I.advanceSec) {
          e.advanceT = 0;
          moveTo(e, e.wagon - 1);
          bus.emit('combat:advance', { e, wagon: state.train.wagons[e.wagon], fromDoor: atDoor });
        }
      } else e.advanceT = 0;
    } else if (wave) {
      // Infestation : de temps en temps, un ennemi du groupe passe au wagon voisin
      wave.spreadT = (wave.spreadT || 0) + dt / Math.max(1, c.enemies.filter(x => x.wave === e.wave && x.phase === 'attached').length);
      if (wave.spreadT >= I.spreadSec) {
        wave.spreadT = 0;
        const dir = e.wagon === 0 ? 1 : e.wagon === n - 1 ? -1 : (rngNext(state) < 0.5 ? -1 : 1);
        const j = e.wagon + dir;
        if (j >= 0 && j < n) { moveTo(e, j); bus.emit('combat:spread', { e, wagon: state.train.wagons[j] }); }
      }
    }
  }
}
