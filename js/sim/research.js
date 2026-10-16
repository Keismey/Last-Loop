// Recherche (GDD §10) : achat avec du Savoir, effets lus par l'économie, l'équipage et le combat.
import { RESEARCH } from '../data/research.js';
import { zoneMax } from './zones.js';
import { bus } from '../core/bus.js';

export const hasResearch = (state, id) => !!(state.research && state.research[id]);
export const hasLab = state => state.train.wagons.some(w => w.type === 'lab');

export function canResearch(state, id) {
  const R = RESEARCH[id];
  if (!R) return { ok: false, reason: 'none' };
  if (hasResearch(state, id)) return { ok: false, reason: 'done' };
  if (!hasLab(state)) return { ok: false, reason: 'lab' };
  if (R.tier > zoneMax(state)) return { ok: false, reason: 'zone' };
  if ((R.needs || []).some(n => !hasResearch(state, n))) return { ok: false, reason: 'needs' };
  if ((state.resources.know || 0) < R.cost) return { ok: false, reason: 'cost' };
  return { ok: true };
}

export function doResearch(state, id) {
  const c = canResearch(state, id);
  if (!c.ok) return c;
  state.resources.know -= RESEARCH[id].cost;
  state.research = state.research || {};
  state.research[id] = state.route.lap;
  bus.emit('research:done', id);
  bus.emit('crew:changed');
  return { ok: true };
}

// Somme d'un effet sur toutes les recherches faites (0 si aucune)
export function fx(state, key) {
  let v = 0;
  if (!state.research) return 0;
  for (const id of Object.keys(state.research)) {
    const f = RESEARCH[id] && RESEARCH[id].fx;
    if (f && typeof f[key] === 'number') v += f[key];
  }
  return v;
}
export const fxOn = (state, key) => !!state.research && Object.keys(state.research).some(id => RESEARCH[id] && RESEARCH[id].fx[key]);

export const doneCount = state => Object.keys(state.research || {}).filter(id => RESEARCH[id]).length;
