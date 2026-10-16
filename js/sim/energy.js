// Énergie, vitesse et combustible (GDD §4.4), production des wagons (GDD §4.3).
import { BALANCE } from '../data/balance.js';
import { WAGONS } from '../data/wagons.js';
import { workers } from './crew.js';
import { capacities } from '../core/state.js';
import { COMBAT } from '../data/enemies.js';
import { fx } from './research.js';
import { BUILD } from '../data/build.js';
import { zoneOf } from '../data/zones.js';

// Climat de la zone (consommation, Serre) : 1 = neutre
const climate = state => zoneOf(state.route ? state.route.ring : 1).mods;

// Un wagon attaqué produit moitié moins (GDD §6.1)
const underAttack = w => (w.attacked ? COMBAT.attackedProduction : 1);
const steamOn = state => !!(state.combat && state.combat.steam && state.combat.steam.left > 0);

const levelMult = w => 1 + BALANCE.energy.levelBonus * (w.level - 1);

// Calcule l'énergie produite et demandée ; résultat rangé dans state.power (affiché par l'interface)
export function computePower(state, running = true) {
  const E = BALANCE.energy;
  const wagons = state.train.wagons;
  let produced = 0;
  // Pleine vapeur : la traction demande deux fois plus d'énergie
  const traction = steamOn(state) ? COMBAT.abilities.fullsteam.traction : 1;
  let demand = running ? (E.tractionBase + E.tractionPerWagon * wagons.length) * traction : 0;
  for (const w of wagons) {
    const def = WAGONS[w.type];
    if (!def || w.broken) continue;
    if (w.type === 'boiler') {
      const sumEff = workers(state, w).reduce((a, x) => a + x.eff, 0);
      produced += (def.produce.powerBase + def.produce.powerPerWorker * sumEff * levelMult(w)) * underAttack(w) * (1 + fx(state, 'boilerPower'));
    } else {
      demand += def.power;
    }
    if (w.roofTurret) demand += BUILD.roofTurret.power;
  }
  produced = Math.min(produced, E.locoMaxPower[state.train.loco]);
  if (state.resources.fuel <= 0) produced = 0;
  const ratio = demand > 0 ? Math.min(1, produced / demand) : 1;
  state.power = {
    produced, demand, ratio,
    factor: 0.3 + 0.7 * ratio                // facteur d'énergie : production des wagons et vitesse
  };
  return state.power;
}

// Flux continus (par seconde) : production et consommation du train, regroupés par source.
// Un groupe (un wagon) ne tourne que si toutes ses dépenses sont payables. Sert à la simulation et au bilan.
//  running : le train roule (la traction demande de l'énergie, donc du Combustible)
export function economyFlows(state, running) {
  const p = computePower(state, running);
  const E = BALANCE.energy;
  const mult = BALANCE.incomeMult;
  const cons = BALANCE.consumptionMult;
  const cl = climate(state);
  const flows = [];
  const add = (src, res, v, group = src) => { if (v) flows.push({ src, res, v, group }); };

  // Combustible brûlé par les chaudières
  add('boiler', 'fuel', -E.fuelPerPower * Math.min(p.demand, p.produced) * E.locoFuelCoef[state.train.loco] * cons * cl.fuel * (1 + fx(state, 'fuelUse')));

  for (const w of state.train.wagons) {
    const def = WAGONS[w.type];
    if (!def || !def.produce || w.broken) continue;
    const sumEff = workers(state, w).reduce((a, x) => a + x.eff, 0);
    if (!sumEff) continue;
    const k = sumEff * levelMult(w) * p.factor * underAttack(w);
    const pr = def.produce;
    const g = w.type + ':' + w.id;
    if (pr.food) add(w.type, 'food', pr.food * k * mult * cl.greenhouse * (1 + fx(state, 'foodProd')), g);
    if (pr.know) add(w.type, 'know', pr.know * k * mult, g);
    if (w.type === 'workshop' && w.recipe === 'ammo') {
      // Recette Munitions (GDD §4.3)
      add(w.type, 'scrap', -pr.ammoScrapCost * k, g);
      add(w.type, 'ammo', pr.ammo * k * mult, g);
    } else if (pr.parts) {
      add(w.type, 'scrap', -(pr.partsScrapCost || 0) * k, g);
      add(w.type, 'fuel', -(pr.partsFuelCost || 0) * k, g);
      add(w.type, 'parts', pr.parts * k * mult, g);
    }
  }
  // Nourriture de l'équipage
  add('crew', 'food', -BALANCE.crew.foodPerSec * state.crew.length * cons * cl.food);
  return flows;
}

// Production et consommation de la seconde écoulée
export function updateEconomy(state, dt) {
  const res = state.resources;
  const flows = economyFlows(state, state.route.mode === 'run');
  // Par groupe : un atelier sans Ferraille s'arrête (le Combustible et les repas passent toujours)
  const groups = new Map();
  for (const f of flows) { if (!groups.has(f.group)) groups.set(f.group, []); groups.get(f.group).push(f); }
  for (const [g, fs] of groups) {
    const conditional = g.includes(':');
    if (conditional && fs.some(f => f.v < 0 && (res[f.res] || 0) < -f.v * dt)) continue;
    for (const f of fs) res[f.res] = (res[f.res] || 0) + f.v * dt;
  }

  // Bornes : jamais négatif, jamais au-delà de la capacité
  const caps = capacities(state);
  for (const r of Object.keys(res)) res[r] = Math.max(0, Math.min(caps[r] ?? Infinity, res[r]));
}

// Multiplicateur de récolte des Plateaux (affiché ; utilisé aux arrêts au jalon J4)
export function harvestMultiplier(state) {
  // 0,4 sans équipage (la base ne compte qu'une fois), +0,3 par travailleur, plafonné à ×4
  const plates = state.train.wagons.filter(w => w.type === 'gatherer' && !w.broken);
  let m = WAGONS.gatherer.produce.harvestBase;
  for (const w of plates) {
    m += WAGONS.gatherer.produce.harvestPerWorker * workers(state, w).reduce((a, x) => a + x.eff, 0) * levelMult(w) * underAttack(w);
  }
  return Math.min(4, m);
}
