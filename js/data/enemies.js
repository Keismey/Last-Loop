// Ennemis, boss et règles du combat (GDD §6). Valeurs ⚙ du circuit 1.
//  hp, dps : points de vie et dégâts par seconde ; armor : part des dégâts ignorée
//  arrive : secondes entre l'apparition et l'accrochage ; fly : volant (drones)
//  threat : coût dans le budget de menace d'une vague ; loot : butin à la mort (chance : lootChance)
export const ENEMIES = {
  biker: { hp: 20, dps: 1.2, armor: 0, arrive: 4, threat: 1, loot: { scrap: 3 } },
  runner: { hp: 28, dps: 1.8, armor: 0, arrive: 5, threat: 1.5, loot: { scrap: 4 } },
  drone: { hp: 14, dps: 2.4, armor: 0, arrive: 3, fly: true, threat: 1, loot: { parts: 1 }, lootChance: 0.3 },
  brute: { hp: 90, dps: 4, armor: 0.3, arrive: 8, threat: 4, loot: { scrap: 8, ammo: 3 }, minBudget: 6 },
  wolf: { hp: 16, dps: 1.4, armor: 0, arrive: 3, threat: 0.7, loot: { food: 4 } },
  sandcrawler: { hp: 60, dps: 3, armor: 0.15, arrive: 7, threat: 2.5, loot: { scrap: 6, fuel: 4 } },
  wraith: { hp: 150, dps: 6, armor: 0.4, arrive: 10, threat: 6, loot: { parts: 3, know: 2 } },
  militia: { hp: 18, dps: 1.0, armor: 0.1, arrive: 5, threat: 1, loot: { food: 3 } }
};

// Boss (PV absolus). summon : renforts invoqués quand ses PV passent sous chaque seuil.
export const BOSSES = {
  // Le Roi des Rails : phase 1, il enfonce le fourgon blindé à coups de bélier (charges annoncées) ;
  // phase 2, il saute des rails et longe le train pour frapper un wagon après l'autre.
  boss_c1: {
    hp: 600, dps: 5, armor: 0.2, arrive: 9, summon: { type: 'biker', n: 3, at: [0.66, 0.33] },
    ram: { warn: 2.2, recover: 4.5, dmg: 40, guardCut: 0.15, guardCutMax: 0.6, guardHit: 6 },
    jumpSec: 1.3, moveSec: 1.6, strikeSec: 7, strikeMult: 1.1
  }
};

// Errants, repaires de pillards et renforts de forteresse : pondérations par zone (anneau)
export const BIOME_POOLS = {
  1: { biker: 60, runner: 25, brute: 15 },                    // Plaines de Cendre
  2: { sandcrawler: 40, biker: 30, drone: 30 },               // Désert de Verre
  3: { wolf: 45, brute: 25, drone: 20, wraith: 10 }           // Toundra fantôme (spectres près du Terminus)
};

// Défenseurs des autres camps, quel que soit le biome (les pillards utilisent le biome)
export const CAMP_POOLS = {
  village: { militia: 80, brute: 20 },
  nomads: { runner: 60, biker: 40 },
  outpost: { militia: 40, brute: 30, drone: 30 }
};

export const COMBAT = {
  wanderChance: 0.12,        // errants : chance par transit
  wanderBudget: 3,           // × facteur d'anneau
  warnChance: 0.2,           // tirs de semonce d'un camp méfiant
  campApproachSec: 6,        // un camp attaque 6 s avant que le train arrive à sa hauteur
  twoWavesFrom: 8,           // camp hostile : 2 vagues à partir de cette force
  secondWaveSec: 10,
  fortressBudget: 4,         // renforts de forteresse, × facteur d'anneau
  reinforceSec: [25, 55, 85],   // renforts de la forteresse tant que le boss vit
  spawnGap: [0.4, 1.6],      // écart entre deux ennemis d'une même vague (s)
  maxOnScreen: 12,
  rearChance: 0.7,           // les poursuivants arrivent surtout par l'arrière
  approachDist: 520,         // distance parcourue avant l'accrochage (unités du train)
  // Tourelles (GDD §6.4)
  turretRange: 3,
  dpsPerEff: 6,
  turretLevelBonus: 0.15,
  ammoPerEff: 0.3,
  noAmmoFactor: 0.2,         // tir de fortune
  inRangeFrom: 0.45,         // un ennemi en approche devient une cible à 45 % de sa course
  // Effets sur le convoi
  crewDamageShare: 0.1,      // les survivants en poste dans un wagon attaqué prennent 10 % des dégâts
  attackedProduction: 0.5,
  // Intégrité (GDD §4.5)
  integrityPerLevel: 10,
  lowIntegrity: 0.3,
  depotRepair: 0.3,
  derail: { resLoss: 0.4, hp: 20, integrity: 0.4 },
  fleeBelow: 0.3,            // à l'arrêt : sous 30 % d'intégrité, le train s'enfuit
  // Forteresse (GDD §6.6)
  fortressReward: { keys: 3, scrap: 60, ammo: 20, know: 10 },
  victoryLeaveSec: 3,
  // Ateliers du dépôt, pendant la Halte (en attendant les gares du jalon J6)
  depot: { repair: { cost: { scrap: 10 }, gain: 25 }, rearm: { cost: { scrap: 10 }, gain: 8 } },
  // Capacités du chef de train (GDD §6.5)
  abilities: {
    fullsteam: { tier: 1, dur: 8, cd: 45, cost: { fuel: 8 }, speed: 1.5, traction: 2, detachSec: 5, needsRun: true },
    barrage: { tier: 2, dur: 6, cd: 40, cost: {}, dmg: 2, ammo: 2 }
  },
  // Déplacements à bord : propagation des errants, avancée des assaillants (secondes)
  incursion: { spreadSec: 12, advanceSec: 3, moveSec: 1 },
  // Régénération de l'intégrité (GDD §4.5) : passive, plus chaque mécanicien d'Atelier ou de Fonderie
  regen: { base: 0.05, perMechanic: 0.06 }
};

export const ringFactor = ring => 1 + 0.1 * (ring - 1);
