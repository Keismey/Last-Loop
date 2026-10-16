// Équipement des survivants : armes et armures (idée du manager, à la Fallout Shelter). Valeurs ⚙.
//  Armes : dps à efficacité 1 ; range = nombre de wagons couverts de chaque côté (0 = corps à corps, son wagon seulement)
//          ammo = Munitions par seconde de tir (armes à feu)
//  Armures : armor = part des coups ignorée
//  value : prix de base en Ferraille (gares) ; tier : rareté (1 courant, 2 peu courant, 3 rare)
export const WEAPONS = {
  fists: { dps: 1.5, range: 0, value: 0, tier: 0 },
  knife: { dps: 3, range: 0, value: 12, tier: 1 },
  pipe: { dps: 4, range: 0, value: 15, tier: 1 },
  machete: { dps: 5.5, range: 0, value: 30, tier: 2 },
  sledge: { dps: 8, range: 0, value: 55, tier: 3 },
  pistol: { dps: 5, range: 1, ammo: 0.05, value: 35, tier: 2 },
  crossbow: { dps: 5.5, range: 1, value: 40, tier: 2 },
  rifle: { dps: 7, range: 2, ammo: 0.08, value: 60, tier: 3 },
  shotgun: { dps: 10, range: 1, ammo: 0.12, value: 70, tier: 3 }
};

export const ARMORS = {
  leather: { armor: 0.15, value: 18, tier: 1 },
  scrapplate: { armor: 0.3, value: 40, tier: 2 },
  riot: { armor: 0.45, value: 70, tier: 3 },
  brutearmor: { armor: 0.55, value: 90, tier: 3 }
};

export const itemKind = type => (WEAPONS[type] ? 'weapon' : ARMORS[type] ? 'armor' : null);
export const itemDef = type => WEAPONS[type] || ARMORS[type] || null;

// Fabrication en Halte (dépôt ou gare)
export const CRAFT = {
  pipe: { scrap: 12 },
  knife: { scrap: 10, parts: 1 },
  leather: { scrap: 14, food: 6 },
  machete: { scrap: 22, parts: 3 },
  crossbow: { scrap: 25, parts: 5 },
  pistol: { scrap: 20, parts: 8 },
  scrapplate: { scrap: 35, parts: 4 }
};

// Butin des ennemis : chance de lâcher un objet, et tirage pondéré parmi la liste
export const LOOT = {
  biker: { chance: 0.08, items: { pipe: 3, knife: 3, leather: 2, pistol: 1 } },
  runner: { chance: 0.08, items: { knife: 2, pipe: 2, crossbow: 1, leather: 2 } },
  brute: { chance: 0.3, items: { sledge: 2, scrapplate: 3, machete: 2 } },
  militia: { chance: 0.15, items: { rifle: 1, leather: 3, pistol: 2 } },
  drone: { chance: 0.05, items: { pistol: 1 } },
  boss_c1: { chance: 1, items: { shotgun: 1, riot: 1 } }
};

// Trousse de soins (consommable, à la Stimpak) : soigne un survivant, relève un survivant à terre
export const MEDKIT = { cost: { food: 8, parts: 2 }, heal: 40, reviveHp: 25, start: 2 };

// Équipement de départ (nouvelle partie) : une arme par survivant, une veste en réserve
export const START_KIT = { equip: { mec: 'pipe', ter: 'knife', com: 'pistol', sav: 'knife' }, spare: ['leather'] };

// Les recrues arrivent parfois avec leurs affaires
export const RECRUIT_KIT = { chance: 0.6, items: ['pipe', 'knife', 'knife', 'machete', 'pistol', 'crossbow', 'leather', 'leather'] };

// Défense du train par l'équipage
export const DEFENSE = {
  share: 0.35,          // part des coups d'un ennemi encaissée par les défenseurs du wagon (le reste va à l'intégrité)
  noAmmoFactor: 0.3,    // arme à feu sans munitions : on se bat à la crosse
  calmSec: 4,           // un renfort retourne au repos après 4 s sans ennemi sur son wagon
  minHp: 40,            // la garde automatique n'envoie que des survivants à 40 PV ou plus
  xpEverySec: 8,        // 1 point d'expérience en Combat toutes les 8 s de combat
  stationItems: 1       // objets vendus par passage en gare
};
