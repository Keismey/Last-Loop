// Recherche (GDD §10), adaptée aux 3 zones : chaque palier s'ouvre en arrivant dans sa zone.
// Achat instantané avec du Savoir ; il faut un Laboratoire dans le train. Valeurs ⚙.
//  branch : moteur | survie | armement ; tier : zone où la recherche devient possible ; needs : prérequis
//  fx : effet (lu par sim/research.js)
export const RESEARCH = {
  // Palier 1 — Plaines de Cendre (≈ 130 Savoir : 4 à 5 tours de Laboratoire)
  boiler_eff: { branch: 'engine', tier: 1, cost: 12, fx: { boilerPower: 0.10 } },
  insulation: { branch: 'engine', tier: 1, cost: 25, fx: { fuelUse: -0.15 } },
  hydro: { branch: 'survival', tier: 1, cost: 15, fx: { foodProd: 0.15 } },
  mapping: { branch: 'survival', tier: 1, cost: 15, fx: { mapping: true } },
  medic: { branch: 'survival', tier: 1, cost: 25, fx: { heal: 0.5 } },
  ap_ammo: { branch: 'arms', tier: 1, cost: 20, fx: { damage: 0.10, pierce: 0.5 } },
  bigcargo: { branch: 'survival', tier: 1, cost: 20, fx: { capacity: 0.25 } },
  // Palier 2 — Désert de Verre
  diesel: { branch: 'engine', tier: 2, cost: 60, needs: ['boiler_eff'], fx: { loco: 3 } },
  canteen: { branch: 'survival', tier: 2, cost: 30, needs: ['hydro'], fx: { morale: 8 } },
  training: { branch: 'survival', tier: 2, cost: 40, needs: ['medic'], fx: { xp: 0.5 } },
  foundry: { branch: 'arms', tier: 2, cost: 30, fx: { unlock: 'foundry' } },
  composite: { branch: 'arms', tier: 2, cost: 45, needs: ['foundry'], fx: { integrity: 0.25 } },
  // Palier 3 — Toundra fantôme
  hybrid: { branch: 'engine', tier: 3, cost: 120, needs: ['diesel'], fx: { loco: 4 } },
  autoturret: { branch: 'arms', tier: 3, cost: 55, needs: ['ap_ammo'], fx: { unlock: 'autoturret' } },
  scope: { branch: 'arms', tier: 3, cost: 70, needs: ['autoturret'], fx: { turretDamage: 0.20, range: 1 } }
};

export const RESEARCH_BRANCHES = ['engine', 'survival', 'arms'];
