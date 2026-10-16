// Réparations des wagons en panne (GDD §4.5).
// Tout survivant présent dans un wagon en panne le répare : ses postes de travail, ou la place « réparation »
// qu'on obtient en le glissant sur le wagon. Vitesse = efficacité en Mécanique : 30 s pour une efficacité de 1.
import { ROUTE } from '../data/sites.js';
import { efficiency } from './crew.js';
import { bus } from '../core/bus.js';

export function repairers(state, w) {
  return state.crew.filter(s => s.post && s.post.wagon === w.id && s.state !== 'injured' && s.state !== 'critical');
}

export function repairRate(state, w) {
  return repairers(state, w).reduce((a, s) => a + efficiency(s, 'mec'), 0) / ROUTE.repairSec;
}

export function updateRepairs(state, dt) {
  for (const w of state.train.wagons) {
    if (!w.broken) continue;
    const rate = repairRate(state, w);
    if (!rate) continue;
    w.repairT = (w.repairT || 0) + rate * dt;     // de 0 à 1
    if (w.repairT >= 1) finishRepair(state, w);
  }
}

export function finishRepair(state, w) {
  w.broken = false;
  w.repairT = 0;
  for (const s of state.crew) {
    if (s.post && s.post.wagon === w.id && s.post.slot === 'repair') {
      s.post = null;
      s.state = 'idle';
    }
  }
  bus.emit('wagon:repaired', w);
  bus.emit('crew:changed');
}

export function repairNow(state, w) {
  if (!w.broken || state.resources.parts < ROUTE.repairParts) return false;
  state.resources.parts -= ROUTE.repairParts;
  finishRepair(state, w);
  return true;
}

// Quelqu'un répare-t-il ce wagon ?
export function canAutoRepair(state, w) {
  return repairers(state, w).length > 0;
}

// Envoie un survivant réparer un wagon en panne (place « réparation »)
export function sendToRepair(state, s, w) {
  if (!w.broken || s.state === 'injured' || s.state === 'critical') return false;
  s.post = { wagon: w.id, slot: 'repair' };
  s.state = 'working';
  bus.emit('crew:changed');
  return true;
}
