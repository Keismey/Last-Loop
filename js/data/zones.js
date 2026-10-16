// Les 3 zones du jeu (feuille de route du 15 octobre 2026). Une zone = un anneau de voies (circuits.js).
// Plafonds : la zone la plus avancée atteinte fixe le niveau max des wagons et les locomotives achetables.
// Boss : le battre une première fois donne son matériau ; avec lui, l'atelier de la traverse fabrique
// l'équipement de zone qui ouvre la suivante. Les zones 2 et 3 n'ont pas encore de voies (ready: false).
//  mods : modificateurs du climat (1 = neutre) — consommation de Vivres et de Combustible, repousse des sites,
//         production de la Serre
export const ZONES = {
  1: {
    id: 1, name: 'Les Plaines de Cendre', ready: true,
    levelCap: 2, locos: [1, 2],
    boss: 'boss_c1', bossLoot: 'kingplate', kit: 'cooler', next: 2,
    mods: { food: 1, fuel: 1, regrow: 1, greenhouse: 1 }
  },
  2: {
    id: 2, name: 'Le Désert de Verre', ready: false,
    levelCap: 3, locos: [3],
    boss: 'boss_c2', bossLoot: 'miragecore', kit: 'icebreaker', next: 3,
    mods: { food: 1.3, fuel: 1, regrow: 0.5, greenhouse: 0.8 }
  },
  3: {
    id: 3, name: 'La Toundra fantôme', ready: false,
    levelCap: 3, locos: [4],
    boss: 'boss_c3', bossLoot: null, kit: null, next: null,
    mods: { food: 1, fuel: 1.4, regrow: 0.7, greenhouse: 1 }
  }
};

// Matériaux de boss (on ne les trouve nulle part ailleurs)
export const MATERIALS = ['kingplate', 'miragecore'];

// Équipements de zone : un seul emplacement sur la locomotive ; le nouveau remplace l'ancien
export const ZONE_KITS = {
  cooler: { opens: 2, cost: { material: 'kingplate', scrap: 120, parts: 40 } },
  icebreaker: { opens: 3, cost: { material: 'miragecore', scrap: 200, parts: 80 } }
};

export const zoneOf = ring => ZONES[ring] || ZONES[1];
