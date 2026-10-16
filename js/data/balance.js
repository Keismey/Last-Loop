// Valeurs d'équilibrage ⚙ (GDD). Aucune valeur de ce genre ne doit être écrite en dur ailleurs.
export const BALANCE = {
  // Multiplicateurs globaux (GDD §9)
  incomeMult: 1,
  consumptionMult: 1,
  enemyMult: 1,
  gameSpeed: 1,

  // Ressources principales et secondaires (GDD §4.7)
  primary: ['fuel', 'food', 'scrap'],
  secondary: ['ammo', 'parts', 'know'],

  // Composition et ressources de départ (GDD §4.6)
  start: {
    loco: 1,
    // La Tourelle au milieu : avec sa portée de 3 wagons, elle couvre tout le convoi de départ
    wagons: ['boiler', 'greenhouse', 'bunk'],     // Tourelle et Plateau de récolte se construisent ensuite
    resources: { fuel: 120, food: 90, scrap: 80, ammo: 30, parts: 5, know: 0, keys: 0 }
  },

  // Stockage (GDD §4.7)
  storage: {
    locoBase: { 1: [150, 60], 2: [250, 100], 3: [350, 160], 4: [500, 300], 5: [700, 400] },
    perWagonLevel: [15, 6],
    keysCap: 99
  },

  // Vitesse des locomotives (GDD §4.2)
  locoSpeed: { 1: 1.0, 2: 1.2, 3: 1.45, 4: 1.7, 5: 2.0 },

  // Équipage (GDD §5)
  crew: {
    startMains: ['mec', 'ter'],   // 2 survivants au départ (un chauffeur, un jardinier) ; on recrute ensuite
    startMainLevel: 3,
    effPerSkill: 0.12,          // efficacité = (1 + 0,12 × (compétence − 1)) × (0,7 + 0,3 × moral / 100)
    foodPerSec: 0.04,           // Vivres mangés par survivant (0,03 au GDD : trop facile, réglage du 15/10)
    starveHpPerSec: 0.25,
    starveMorale: -25,
    moraleBase: 55,
    moralePerBunkLevel: 5,
    moraleFed: 10,              // si Vivres > 25 % de la capacité
    moraleLowIntegrity: -10,
    moraleCrowded: -12,         // plus de survivants que de couchages : on dort par terre
    moraleDeath: -15,           // un compagnon meurt (coup immédiat, le moral remonte ensuite)
    moraleWave: 3,              // vague repoussée
    moraleVictory: 8,           // camp pillé, forteresse prise
    moraleRate: 0.4,            // vitesse à laquelle le moral rejoint sa cible (points/s)
    restHeal: 0.8,              // PV/s au repos (× 1 + 0,3 × (niveau du Dormoir − 1))
    workHeal: 0.1,              // PV/s en poste
    injuredBelow: 30,
    backToWorkAt: 70,
    criticalSec: 30,
    minCrew: 3,                 // garde-fou : sous ce nombre, les survivants à terre ne meurent plus            // état critique avant la mort
    criticalSavedHp: 10,
    xpEverySec: 10,             // 1 XP toutes les 10 s de travail
    xpPerLevel: 40,             // niveau suivant à 40 × compétence XP
    cabinBeds: 0,               // la cabine de la locomotive n'est plus un couchage (retour du manager)
    stowawayBelow: 2,           // garde-fou : passager clandestin si moins de 2 survivants
    stowawayDelaySec: 60
  },

  // Énergie et vitesse (GDD §4.4)
  energy: {
    tractionBase: 4,
    tractionPerWagon: 0.5,
    fuelPerPower: 0.0135,
    locoMaxPower: { 1: 14, 2: 22, 3: 34, 4: 50, 5: 75 },
    locoFuelCoef: { 1: 1.0, 2: 0.95, 3: 0.85, 4: 0.75, 5: 0.55 },
    levelBonus: 0.15            // effet par travailleur × (1 + 0,15 × (niveau − 1))
  },

  // Défilement (GDD §14.3)
  scroll: {
    nearPxPerSec: 120,            // couche proche, à vitesse ×1
    layerSpeeds: [0.1, 0.35, 1.0] // lointain, moyen, proche
  }
};

// Progression entre les zones et tension (feuille de route du 15 octobre 2026). Valeurs ⚙.
export const PROGRESS = {
  // Traque : +huntStep de menace par tour au-delà de huntGrace tours dans la zone, tant que le boss vit
  huntGrace: 3,
  huntStep: 0.12,
  huntMax: 8,
  huntDerailRelief: 2,          // un déraillement fait reculer la traque de 2 crans
  huntToughness: 0.06,          // PV des ennemis +6 % par cran de traque (dégâts +3 %)
  // Entretien au dépôt, par wagon selon son niveau
  upkeep: [{ scrap: 3, parts: 0 }, { scrap: 6, parts: 1 }, { scrap: 10, parts: 2 }],
  upkeepPartsWorth: 4,          // une Pièce manquante compte comme 4 Ferraille manquantes
  upkeepShortDamage: 1.5,       // intégrité perdue par Ferraille manquante
  upkeepShortMorale: 8,         // moral perdu par tout l'équipage si l'entretien n'est pas payé
  depotIntegrityFloor: 0.3      // garde-fou : intégrité minimale en quittant le dépôt
};
