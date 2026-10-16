// Événements aléatoires (GDD §7). Valeurs ⚙.
// 22 % par embranchement, pendant un transit ; jamais à l'arrêt ni en combat ; jamais deux fois le même de suite.
// Le jeu est en pause tant que la carte est ouverte. S = butin du circuit (multiplie les gains).
//  choices : id du choix ; cost : prélevé en choisissant ; need : condition pour pouvoir choisir
export const EVENT_RULES = { chance: 0.22, at: [0.25, 0.7], notFirstLeg: true };

export const EVENTS = {
  survivor: { weight: 10, choices: [{ id: 'welcome', cost: { food: 10 }, need: 'bed' }, { id: 'pass' }] },
  convoy: { weight: 10, choices: [{ id: 'search' }, { id: 'ignore' }] },
  merchant: { weight: 10, choices: [{ id: 'ammo', cost: { scrap: 15 } }, { id: 'parts', cost: { food: 20 } }, { id: 'pass' }] },
  storm: { weight: 8, choices: [{ id: 'rush', cost: { fuel: 10 } }, { id: 'slow' }, { id: 'endure' }] },
  mechanic: { weight: 8, choices: [{ id: 'help', cost: { food: 10 } }, { id: 'pass' }] },
  rail: { weight: 8, choices: [{ id: 'repair', cost: { scrap: 20 } }, { id: 'force' }] },
  warehouse: { weight: 6, choices: [{ id: 'take' }] },
  epidemic: { weight: 6, choices: [{ id: 'isolate' }, { id: 'ignore' }] },
  map: { weight: 7, choices: [{ id: 'decode', need: 'savoir3' }, { id: 'burn' }] },
  overheat: { weight: 8, choices: [{ id: 'purge', cost: { fuel: 10 } }, { id: 'force' }] }
};

// Effets chiffrés
export const EVENT_FX = {
  convoyScrap: 25, ambushChance: 0.25, ambushBudget: 4,
  merchantAmmo: 10, merchantParts: 10,
  stormSteamSec: 8, slowMult: 0.7, slowSec: 20, stormDamage: 15,
  mechanicParts: 20,
  railStopSec: 10, railDamage: 20, railChance: 0.5,
  warehouseFood: 20, warehouseMorale: 10,
  isolateHp: 25, epidemicMorale: 15, epidemicInjureChance: 0.2,
  mapSavoir: 3, burnFuel: 10,
  forceMult: 1.3, forceSec: 20, boilerBreakChance: 0.4
};
