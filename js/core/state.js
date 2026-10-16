// État unique de la partie, entièrement sérialisable en JSON (GDD §17.4).
import { BALANCE } from '../data/balance.js';
import { BUILD } from '../data/build.js';
import { newSeed } from './rng.js';
import { newRoute } from '../sim/route.js';
import { newCombat, maxIntegrity } from '../sim/combat.js';
import { fx } from '../sim/research.js';

export const STATE_VERSION = 8;

export function createState() {
  const seed = newSeed();
  const s = BALANCE.start;
  const state = {
    version: STATE_VERSION,
    tuto: { step: 0, done: false },     // tutoriel guidé (sert d'introduction)
    tipsSeen: {},
    seed,
    rngState: seed,
    time: 0,                        // secondes de jeu écoulées
    resources: { ...s.resources },
    train: {
      loco: s.loco,
      wagons: s.wagons.map((type, i) => ({ id: 'w' + (i + 1), type, level: 1, broken: false }))
    },
    crew: [],
    nextCrewId: 0,
    inventory: [],                  // équipement du train (armes, armures)
    nextItemId: 1,
    memorial: [],
    route: newRoute(1),
    combat: newCombat(),
    world: {},
    research: {},
    progress: { zone: 1, kit: null, materials: {}, bossDown: {}, zoneSince: { 1: 1 } },   // zones (sim/zones.js)
    objectives: {},
    flags: { tutorialDone: false },
    stats: { playTime: 0, laps: 0 },
    createdAt: Date.now()
  };
  state.train.integrity = maxIntegrity(state);
  return state;
}

// Capacités de stockage (GDD §4.7)
export function capacities(state) {
  const st = BALANCE.storage;
  const [pBase, sBase] = st.locoBase[state.train.loco];
  let p = pBase, s = sBase;
  for (const w of state.train.wagons) {
    p += st.perWagonLevel[0] * w.level;
    s += st.perWagonLevel[1] * w.level;
    // Grenier sur le toit, Soute (GDD §4.7)
    if (w.attic) { p += BUILD.attic.primary; s += BUILD.attic.secondary; }
    if (w.type === 'cargo') { const c = BUILD.cargoCaps[w.level - 1] || 0; p += c; s += c / 2; }
  }
  // Soutes renforcées (recherche)
  const k = 1 + fx(state, 'capacity');
  p = Math.round(p * k); s = Math.round(s * k);
  const caps = { keys: st.keysCap };
  BALANCE.primary.forEach(r => (caps[r] = p));
  BALANCE.secondary.forEach(r => (caps[r] = s));
  return caps;
}

// Résumé lu par le hub Keismey Studio (GDD §17.13)
export function summary(state) {
  return {
    ring: state.route.ring,
    lap: state.route.lap,
    loco: state.train.loco,
    keys: Math.floor(state.resources.keys || 0),
    ended: !!state.flags.ended
  };
}
