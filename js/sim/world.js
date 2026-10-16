// État du monde (GDD §3.2 à §3.5) : stocks des sites, camps, embranchements connus ou ouverts.
// Stocks, repousse, brouillard ; attitudes des camps et liens entre sites (camp.js).
import { getCircuit, findSite } from '../data/circuits.js';
import { SITE_TYPES, CAMP_TYPES } from '../data/sites.js';
import { campTick } from './camp.js';
import { contractTick } from './station.js';
import { zoneOf } from '../data/zones.js';

export function initWorld(state, ring) {
  const w = state.world;
  w.sites = w.sites || {};
  w.branches = w.branches || {};
  w.rings = w.rings || {};
  // Les sites ajoutés par une mise à jour sont créés aussi dans les parties en cours
  w.rings[ring] = w.rings[ring] || { unlocked: true };
  for (const leg of getCircuit(ring).legs) {
    for (const b of leg.branches) {
      w.branches[b.id] = w.branches[b.id] || { known: false, unlocked: !b.lockCost, lastLap: null };
      for (const s of b.sites) {
        if (w.sites[s.id]) continue;
        if (s.type === 'camp') {
          const c = CAMP_TYPES[s.camp];
          w.sites[s.id] = { attitude: c.attitude, defense: s.defense || 0, grudge: false, lastSeen: null };
        } else {
          w.sites[s.id] = s.type === 'fortress' ? { stock: 1, fallen: false, lastSeen: null } : { stock: 1, lastSeen: null };
        }
      }
    }
  }
}

export function siteState(state, id) {
  return state.world.sites[id];
}

export function branchState(state, id) {
  return state.world.branches[id];
}

// Le train vient de voir ce site : on mémorise ce qu'il a observé (la carte montre l'état au dernier passage)
export function markSeen(state, id) {
  const st = siteState(state, id);
  if (!st) return;
  st.lastSeen = { lap: state.route.lap, stock: st.stock, attitude: st.attitude, defense: st.defense };
}

export function markBranchKnown(state, id) {
  const b = branchState(state, id);
  if (!b) return;
  b.known = true;
  b.lastLap = state.route.lap;
}

// Rendement plein d'un site (avant stock, action et multiplicateurs)
export function siteYield(ring, siteId) {
  const s = findSite(ring, siteId);
  const base = SITE_TYPES[s.type] && SITE_TYPES[s.type].yield;
  if (!base) return null;
  const out = { ...base };
  if (s.bonusYield) for (const [r, v] of Object.entries(s.bonusYield)) out[r] = (out[r] || 0) + v;
  if (s.yieldMult) for (const [r, m] of Object.entries(s.yieldMult)) if (out[r]) out[r] *= m;
  return out;
}

// Tick du monde, à l'arrivée au dépôt (GDD §3.5) : repousse des sites, puis camps. Renvoie les nouvelles à afficher.
export function worldTick(state, ring) {
  const news = [];
  const circuit = getCircuit(ring);
  for (const leg of circuit.legs) {
    for (const b of leg.branches) {
      for (const s of b.sites) {
        const type = SITE_TYPES[s.type];
        const st = state.world.sites[s.id];
        if (!type || !type.yield || !st) continue;
        const before = st.stock;
        st.stock = Math.min(1, st.stock + type.regrow * zoneOf(ring).mods.regrow);
        if (before < 1 && st.stock >= 1 && type.regrow > 0) news.push({ key: 'news.regrown', site: s.name });
        else if (st.stock <= 0.25) news.push({ key: 'news.depleted', site: s.name });
      }
    }
  }
  // Puis les camps : rancune, région affamée, prospérité (GDD §3.5)
  news.push(...campTick(state, ring));
  news.push(...contractTick(state, ring));
  return news;
}
