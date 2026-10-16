import { BUILD } from './build.js';

// Types de wagons (GDD §4.3). Valeurs ⚙ à niveau 1 et efficacité 1.
//  skill   : compétence utilisée par l'équipage (null = pas de poste de travail)
//  slots   : postes de travail par niveau [N1, N2, N3]
//  power   : énergie consommée (⚡), sauf la Chaudière qui en produit
//  slotX   : position des postes dans le wagon (fraction de la largeur), dans l'ordre d'occupation
//  anim    : geste des survivants à ce poste
//  beds    : couchages du Dormoir [x (fraction), hauteur depuis le haut de l'image (unités)]
export const WAGONS = {
  boiler: {
    color: '#B5562B', skill: 'mec', slots: [2, 3, 4], power: 0, anim: 'shovel',
    slotX: [0.56, 0.74, 0.86, 0.2],
    produce: { powerBase: 1.5, powerPerWorker: 6 }
  },
  greenhouse: {
    color: '#3E8E8A', skill: 'ter', slots: [2, 3, 4], power: 2, anim: 'water',
    slotX: [0.46, 0.7, 0.86, 0.3],
    produce: { food: 0.06 }
  },
  bunk: {
    color: '#8a7f86', skill: null, slots: [0, 0, 0], power: 1, beds: [4, 6, 8],
    bedPos: [[0.367, 75.3], [0.726, 75.3], [0.367, 49.7], [0.726, 49.7]]
  },
  gatherer: {
    color: '#E8A33D', skill: 'ter', slots: [2, 3, 4], power: 1, anim: 'sort',
    slotX: [0.38, 0.62, 0.8, 0.2],
    produce: { harvestBase: 0.4, harvestPerWorker: 0.3 }
  },
  turret: {
    color: '#C8382D', skill: 'com', slots: [2, 3, 4], power: 1, anim: 'aim',
    slotX: [0.52, 0.34, 0.18, 0.43],      // dans la casemate (la droite du wagon est un mur blindé)
    produce: { dps: 6 }
  },
  workshop: {
    color: '#a39a9e', skill: 'mec', slots: [2, 3, 4], power: 3, anim: 'hammer',
    slotX: [0.3, 0.52, 0.72, 0.14],
    produce: { parts: 0.04, partsScrapCost: 0.12, ammo: 0.08, ammoScrapCost: 0.04 }   // recette Pièces ou Munitions
  },
  cargo: { color: '#7a5c40', skill: null, slots: [0, 0, 0], power: 0 },
  lab: {
    color: '#6fb7b1', skill: 'sav', slots: [2, 3, 4], power: 4, anim: 'read',
    slotX: [0.45, 0.66, 0.84, 0.3],      // devant l'établi (la gauche du wagon est une cloison)
    produce: { know: 0.03 }
  },
  foundry: {
    color: '#e07a3a', skill: 'mec', slots: [2, 3, 4], power: 6, anim: 'hammer',
    slotX: [0.35, 0.6, 0.8, 0.18],
    produce: { parts: 0.07, partsScrapCost: 0.14, partsFuelCost: 0.02 }
  },
  // Fourgon de queue blindé (idée du manager) : pas un wagon, une extension accrochée derrière le dernier.
  // C'est la « porte » du train : les assauts doivent l'enfoncer avant d'entrer. Postes de garde.
  caboose: { color: '#5d5a63', skill: 'com', slots: [1, 2, 2], power: 0, anim: 'aim', slotX: [0.72, 0.88] }
};

// Priorité du bouton « Auto » (GDD §5.5)
export const AUTO_PRIORITY = ['boiler', 'greenhouse', 'turret', 'gatherer', 'workshop', 'lab', 'foundry'];

export function slotCount(w) {
  const def = WAGONS[w.type];
  return def ? def.slots[w.level - 1] || 0 : 0;
}

// Couchages d'un wagon : ceux du Dormoir, plus les Couchettes posées sur le toit
export function bedCount(w) {
  const def = WAGONS[w.type];
  return (def && def.beds ? def.beds[w.level - 1] : 0) + (w.berths ? BUILD.berths.beds : 0);
}
