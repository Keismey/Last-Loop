// Objectifs du carnet de bord : progression (calculée sur l'état), réussite, récompense à récupérer.
import { OBJECTIVES } from '../data/objectives.js';
import { BALANCE } from '../data/balance.js';
import { capacities } from '../core/state.js';
import { progress, zoneMax } from './zones.js';
import { doneCount } from './research.js';
import { bus } from '../core/bus.js';

// Avancement d'un objectif (nombre atteint, plafonné au seuil)
export function objectiveValue(state, o) {
  const st = state;
  let v = 0;
  switch (o.check) {
    case 'laps': v = st.stats.laps || 0; break;
    case 'wagon': v = st.train.wagons.filter(w => w.type === o.type).length; break;
    case 'crew': v = st.crew.length; break;
    case 'kills': v = st.stats.kills || 0; break;
    case 'explored': v = Object.values(st.world.branches || {}).filter(b => b.known).length; break;
    case 'ally': v = Object.values(st.world.sites || {}).filter(s => s.attitude === 'ally').length; break;
    case 'loco': v = st.train.loco; break;
    case 'research': v = doneCount(st); break;
    case 'boss': v = progress(st).bossDown[o.ring] ? 1 : 0; break;
    case 'kit': v = progress(st).kit === o.kit || (o.kit === 'cooler' && zoneMax(st) > 1) ? 1 : 0; break;
    default: v = 0;
  }
  return Math.min(o.n, v);
}

const book = state => (state.objectives = state.objectives || {});
export const objectiveState = (state, id) => book(state)[id] || null;      // null | 'done' | 'claimed'

// Liste de la zone la plus avancée
export const currentObjectives = state => OBJECTIVES[zoneMax(state)] || [];

// Vérifie les objectifs ; renvoie ceux qui viennent d'être atteints
export function checkObjectives(state) {
  const b = book(state);
  const got = [];
  // Première vérification d'une partie (ancienne sauvegarde) : pas d'avalanche d'annonces
  const quiet = !b._seen;
  b._seen = true;
  for (const o of currentObjectives(state)) {
    if (b[o.id]) continue;
    if (objectiveValue(state, o) >= o.n) { b[o.id] = 'done'; got.push(o); if (!quiet) bus.emit('objective:done', o); }
  }
  return got;
}

export const claimable = state => currentObjectives(state).filter(o => book(state)[o.id] === 'done').length;

export function claimObjective(state, id) {
  const o = Object.values(OBJECTIVES).flat().find(x => x.id === id);
  if (!o || book(state)[id] !== 'done') return { ok: false };
  const caps = capacities(state);
  for (const [r, v] of Object.entries(o.reward)) {
    const cap = r === 'keys' ? BALANCE.storage.keysCap : caps[r] ?? Infinity;
    state.resources[r] = Math.min(cap, (state.resources[r] || 0) + v);
  }
  book(state)[id] = 'claimed';
  bus.emit('objective:claimed', o);
  return { ok: true, reward: o.reward };
}
