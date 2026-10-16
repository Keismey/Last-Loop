// Dépôt (GDD §3.7) et déraillement (GDD §4.5) : retour au dépôt, soins, réparations, réserve, résumé du tour.
import { BALANCE, PROGRESS } from '../data/balance.js';
import { ROUTE } from '../data/sites.js';
import { COMBAT } from '../data/enemies.js';
import { worldTick } from './world.js';
import { repairers, finishRepair } from './repair.js';
import { maxIntegrity, onJunction } from './combat.js';
import { junctionPos, defaultChoice, startLapStats } from './route.js';
import { bus } from '../core/bus.js';
import { depotCaboose } from './caboose.js';
import { payUpkeep, huntLevel } from './zones.js';

// ---------- Déraillement (GDD §4.5) : échec doux, retour immédiat au dépôt ----------
export function derailToDepot(state) {
  const D = COMBAT.derail;
  const lost = {};
  for (const res of Object.keys(state.resources)) {
    if (res === 'keys') continue;
    const v = state.resources[res] * D.resLoss;
    if (v > 0) lost[res] = v;
    state.resources[res] -= v;
  }
  for (const s of state.crew) {
    if (s.state === 'critical') { s.state = 'injured'; s.critical = 0; }
    s.hp = D.hp;
    if (s.hp < BALANCE.crew.injuredBelow && s.state !== 'injured') { s.state = 'injured'; s.post = null; }
  }
  state.train.integrity = maxIntegrity(state) * D.integrity;
  state.route.lapStats.derailed = true;
  state.route.lapStats.lost = lost;
  onJunction(state, true);
  bus.emit('crew:changed');
  arriveDepot(state, true);
}

export function arriveDepot(state, derailed = false) {
  const r = state.route;
  r.distance = junctionPos(state);
  r.prevDistance = r.distance;
  r.mode = 'depot';
  r.branch = null;
  r.stop = null;
  r.stopIdx = 0;
  // Soins et réparation du convoi (pas après un déraillement)
  if (!derailed) state.train.integrity = Math.min(maxIntegrity(state), (state.train.integrity || 0) + maxIntegrity(state) * COMBAT.depotRepair);
  depotCaboose(state, derailed);
  for (const w of state.train.wagons) delete w.aim;
  // Les ennemis qui décrochaient ne restent pas figés au dépôt
  if (state.combat) state.combat.enemies = state.combat.enemies.filter(e => e.phase !== 'dead' && e.phase !== 'leave');
  if (!derailed) for (const s of state.crew) {
    if (s.state === 'critical') { s.state = 'injured'; s.critical = 0; s.hp = 10; }
    s.hp = Math.min(100, s.hp + ROUTE.depotHeal);
    if (s.state === 'injured' && s.hp >= BALANCE.crew.backToWorkAt) s.state = 'idle';
  }
  // Réparations en cours : la Halte laisse le temps de les terminer
  for (const w of state.train.wagons) if (w.broken && repairers(state, w).length) finishRepair(state, w);
  // Réserve de secours
  const reserve = {};
  for (const res of ['fuel', 'food']) {
    if (state.resources[res] < ROUTE.depotReserve) {
      reserve[res] = ROUTE.depotReserve - state.resources[res];
      state.resources[res] = ROUTE.depotReserve;
    }
  }
  // Entretien du convoi (Ferraille et Pièces par wagon) ; ce qui manque abîme le train et le moral
  const upkeep = payUpkeep(state);
  // Garde-fou : Gus rafistole toujours le convoi assez pour repartir (jamais de spirale de déraillements)
  state.train.integrity = Math.max(state.train.integrity, maxIntegrity(state) * PROGRESS.depotIntegrityFloor);
  // Tick du monde
  const news = worldTick(state, r.ring);
  // Résumé du tour
  r.summary = {
    lap: r.lap,
    start: r.lapStats.start,
    end: { ...state.resources },
    gained: r.lapStats.gained,
    stops: r.lapStats.stops,
    breakdowns: r.lapStats.breakdowns,
    newBranches: r.lapStats.newBranches,
    keys: r.lapStats.keys,
    waves: r.lapStats.waves,
    kills: r.lapStats.kills,
    derailed: r.lapStats.derailed,
    lost: r.lapStats.lost || null,
    reserve,
    upkeep,
    news,
    memorial: (state.memorial || []).filter(m => m.lap === r.lap).map(m => m.name)
  };
  state.stats.laps = (state.stats.laps || 0) + 1;
  r.lap += 1;
  r.leg = 0;
  r.nextChoice = defaultChoice(state, 0);
  startLapStats(state);
  // Traque pour le tour qui commence (affichée dans le résumé)
  r.summary.hunt = huntLevel(state);
  bus.emit('route:depot', r.summary);
}
