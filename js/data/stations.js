// Gares et commerce (GDD §8). Valeurs ⚙.
export const STATION = {
  trades: 3,
  giveRange: [15, 40],             // quantité donnée, × butin du circuit
  rate: [0.8, 0.95],               // part de la valeur rendue
  values: { fuel: 1, food: 1, scrap: 1.2, ammo: 2, parts: 4, know: 5 },
  giveRes: ['fuel', 'food', 'scrap', 'ammo', 'parts'],
  getRes: ['fuel', 'food', 'scrap', 'ammo', 'parts', 'know'],
  savoirBonus: 0.02, savoirMax: 0.2,   // +2 % par point de Savoir du meilleur survivant
  repBonus: 0.03,                  // +3 % par niveau de réputation
  repPerLevel: 4, repMax: 5,       // niveau = points ÷ 4
  recruitCost: { food: 30, scrap: 15 },
  freeRecruitBelow: 3,
  repair: { cost: { scrap: 10 }, gain: 25 },
  key: { cost: { parts: 60 } },
  rumor: { cost: { parts: 15 } },
  // Contrats (GDD §8.4) : livrer une ressource principale avant 2 ou 3 tours, en repassant par la gare
  contract: { res: ['fuel', 'food', 'scrap'], qty: [60, 120], laps: [2, 3], partsPerValue: 0.4, rep: 4, keyChance: 0.2 }
};

// Spécialités (GDD §8.2)
export const SPECIALTIES = {
  market: { trades: 4, toBonus: { food: 0.1, fuel: 0.1 } },
  forge: { repairScrap: 5, discount: 0.15, guaranteed: 'parts' },
  inn: { recruits: 2 },
  library: { rumorHalf: true, guaranteed: 'know' },
  armory: { guaranteed: 'ammo', guaranteedBonus: 0.2, rearm: { cost: { scrap: 10 }, gain: 12 } },
  // Atelier de la traverse : équipement de zone (sim/zones.js) ; peu de trocs, une forge pour les réparations
  traverse: { trades: 2, repairScrap: 5, guaranteed: 'parts', workshop: true }
};
