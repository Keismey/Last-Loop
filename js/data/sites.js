// Sites (arrêts) et actions de récolte (GDD §3.3, §3.4). Valeurs ⚙.
export const SITE_TYPES = {
  field: { yield: { food: 75 }, regrow: 0.2, replant: true },
  forest: { yield: { fuel: 90, food: 10 }, regrow: 0.15, replant: true },
  mine: { yield: { fuel: 70, scrap: 35 }, regrow: 0.1, replant: false },
  junkyard: { yield: { scrap: 100, parts: 5 }, regrow: 0.2, replant: false },
  ruins: { yield: { scrap: 50, parts: 12, know: 6, ammo: 8 }, regrow: 0, replant: false, keyChance: 0.1 },
  camp: { yield: null },
  station: { yield: null },
  fortress: { yield: null }
};

// Actions possibles à un site de ressources
//  factor : part du rendement plein ; stock : variation du stock ; dur : durée de l'arrêt (s) ; cost : coût
export const ACTIONS = {
  durable: { factor: 0.6, stock: -0.1, dur: 30 },
  intensive: { factor: 1.0, stock: -0.4, dur: 30 },
  replant: { factor: 0.1, stock: 0.3, dur: 25, cost: { food: 5 } },
  assault: { factor: 0, stock: 0, dur: 0 },
  halt: { factor: 0, stock: 0, dur: 0 },      // gare ou camp : Halte, le temps est figé jusqu'au départ
  raid: { factor: 0, stock: 0, dur: 0 },      // camp : pillage, l'arrêt dure jusqu'à la fin du combat
  tribute: { factor: 0, stock: 0, dur: 0 },   // camp hostile : tribut payé à l'approche, pas d'arrêt
  pass: { factor: 0, stock: 0, dur: 0 }
};

// Camps (GDD §3.4) : attitude de départ et force de base. Contacts et combats aux jalons J5 et J6.
export const CAMP_TYPES = {
  village: { attitude: 'peaceful', strength: 3 },
  nomads: { attitude: 'wary', strength: 4 },
  outpost: { attitude: 'suspicious', strength: 6 },
  raiders: { attitude: 'hostile', strength: 5 }
};

// Échelle des attitudes, de la pire à la meilleure (GDD §3.4)
export const ATTITUDES = ['hostile', 'suspicious', 'wary', 'peaceful', 'ally'];

// Contacts avec les camps (GDD §3.4, §3.5, §8.5). Valeurs ⚙.
export const CAMP = {
  rate: { ally: 1.15, peaceful: 1 },          // commerce : taux selon l'attitude
  trades: 2,
  // Ce que le camp vend (le joueur reçoit) et achète (le joueur donne)
  trade: {
    village: { sells: ['food', 'fuel'], buys: ['scrap', 'parts'] },
    nomads: { sells: ['scrap', 'parts'], buys: ['food', 'fuel'] },
    outpost: { sells: ['ammo'], buys: ['food', 'parts'] }
  },
  aid: [{ food: 25 }, { scrap: 20 }],         // Aider : attitude +1 (Allié au plus) ; deux aides de suite effacent la rancune
  allyAids: 2,                                // de Pacifique à Allié : deux aides (lors de deux passages)
  negotiate: { parts: 10 },                   // Négocier (Prudent, Méfiant) : attitude +1
  tribute: [{ food: 30 }, { scrap: 25 }],     // Tribut (Hostile) : pas d'attaque à ce passage
  raidLoot: {
    village: { food: 40, scrap: 10 }, nomads: { scrap: 30, parts: 6 },
    outpost: { ammo: 20, scrap: 15 }, raiders: { scrap: 30, ammo: 15, parts: 4 }
  },
  raidBudget: 1.2,                            // pillage : force du camp × 1,2 (il se défend chez lui)
  raidDefenseLoss: 2,
  allyKey: 1,                                 // premier passage en tant qu'allié : une clé, une fois par camp
  maxDefense: 5
};

export const ATTITUDE_COLORS = {
  ally: '#7ec878', peaceful: '#5c9ad6', wary: '#e8cf4a', suspicious: '#e8933d', hostile: '#C8382D'
};

// Déroulé d'un embranchement (GDD §3.6)
export const ROUTE = {
  transit: 2880,          // longueur d'un transit (unités) : 24 s à vitesse ×1
  decisionSec: 8,         // le panneau d'arrêt s'ouvre 8 s avant l'arrivée
  campDecisionSec: 16,    // camps : 16 s (ils réagissent 6 s avant l'arrivée)
  pickups: 5,             // ramassages par arrêt
  switchWarnSec: 12,      // le pupitre pulse 12 s avant l'aiguillage
  breakdownChance: 0.04,  // par wagon, à la fin de chaque embranchement
  repairSec: 30,          // réparation : 30 s pour une efficacité de 1 en Mécanique (plus vite à plusieurs)
  repairParts: 3,         // réparation immédiate
  depotHeal: 30,
  depotReserve: 40,       // réserve de secours : Charbon et Vivres remontés jusqu'à 40
  stockMin: 0
};

// Images Gemini des sites (planches A, B, C). h : hauteur réelle de l'image (unités du train, 1 m ≈ 26).
// low : version épuisée, affichée en fondu quand le stock baisse.
export const SITE_ART = {
  field: { h: 215, low: true },
  forest: { h: 300, low: true },
  mine: { h: 300, low: true },
  junkyard: { h: 275, low: true },
  ruins: { h: 250 },
  station: { h: 290 },
  depot: { h: 275 },
  fortress: { h: 265 },
  traverse: { h: 300 },      // Atelier de la Traverse (gare à spécialité)
  // images propres à un lieu (site.art) ; sans elles, l'image de son type
  convoy: { h: 235 },       // trois wagons éventrés, à l'échelle du train (assez haut pour dépasser des wagons)
  refinery: { h: 280 }
};
// Camps (images Gemini) : hauteur en unités ; fortifié à partir de cette défense ; drapeau (position, hauteur)
export const CAMP_ART = {
  // sink : part de l'image sous la ligne du sol (Gemini a dessiné le campement un peu en perspective :
  // les tentes posent plus haut que le bas de l'image), par état [normal, fortifié]
  village: { h: 225, flagX: -0.48, sink: [0.055, 0.045] },
  nomads: { h: 215, flagX: -0.48, sink: [0.12, 0.055] },
  outpost: { h: 255, flagX: -0.48 },
  raiders: { h: 255, flagX: -0.47 },
  fortifiedAt: 3,
  flagH: 190,
  signalH: 165
};
