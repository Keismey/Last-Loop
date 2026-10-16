// Construction et amélioration du train (GDD §4.2, §4.3, §4.7). Valeurs ⚙.
// Coûts : scrap = Ferraille, parts = Pièces, know = Savoir.
export const BUILD = {
  // Coût de base d'un wagon ; construire le n-ième du même type coûte base × 1,35^(n − 1)
  cost: {
    boiler: { scrap: 40, parts: 4 }, greenhouse: { scrap: 40, parts: 4 }, bunk: { scrap: 40, parts: 3 },
    gatherer: { scrap: 45, parts: 5 }, turret: { scrap: 50, parts: 8 }, workshop: { scrap: 50, parts: 5 },
    cargo: { scrap: 40, parts: 3 }, lab: { scrap: 80, parts: 20 },
    foundry: { scrap: 100, parts: 30 }
  },
  // Ordre d'affichage dans l'atelier du train
  order: ['workshop', 'turret', 'greenhouse', 'bunk', 'gatherer', 'cargo', 'lab', 'foundry'],
  // Conditions de déblocage (au-delà : jalon de la recherche, J7)
  unlock: { cargo: { laps: 2 }, lab: { loco: 2 }, foundry: { research: 'foundry' } },
  growth: 1.35,
  // Chaudière : une seule par train, toujours juste derrière la locomotive (demande du manager)
  unique: ['boiler'],
  fixedFront: 'boiler',
  // Pas de Grenier ni de Couchettes sur ces wagons (toit pris par la cheminée, la tourelle ou le plateau)
  noRoof: ['boiler', 'turret', 'gatherer', 'foundry'],     // Fonderie : la cheminée
  // Démantèlement (en Halte) : on récupère cette part de ce qu'a coûté la pièce (wagon et ses niveaux, module de toit)
  refund: 0.5,
  levelMult: { 2: 1.5, 3: 3 },     // amélioration : × le coût de base
  maxLevel: 3,
  attic: { cost: { scrap: 20, parts: 4 }, primary: 30, secondary: 12 },
  // Couchettes sur le toit : 2 lits de plus (un seul module de toit par wagon : Grenier OU Couchettes)
  berths: { cost: { scrap: 30, parts: 5 }, beds: 2 },
  // Tourelle auto : extension de toit (idée du manager), tire sans équipage ; l'énergie limite leur nombre
  roofTurret: { cost: { scrap: 90, parts: 40 }, research: 'autoturret', max: 3, power: 3, dps: 7 },
  // Ancien wagon Tourelle auto (sauvegardes ≤ 0.19) : démonté et remboursé entièrement
  oldAutoturret: { scrap: 90, parts: 40 },
  cargoCaps: [150, 300, 500],
  // Fourgon de queue blindé : toujours derrière le dernier wagon, ne compte pas dans la traction.
  //  hp par niveau ; enfoncé à 0, il retient de nouveau les assauts une fois réparé à 25 %.
  //  Il se répare tout seul hors combat (comme l'intégrité), et en Halte contre de la Ferraille.
  caboose: {
    cost: { scrap: 60, parts: 8 },
    up: { 2: { scrap: 90, parts: 20 }, 3: { scrap: 160, parts: 45 } },
    hp: [150, 260, 400],
    holdAt: 0.25,
    repairScrapPerHp: 0.2
  },      // Soute : + principales (les secondaires prennent la moitié)
  // Locomotives : nombre de wagons tirés, blindage, coût d'achat, zone où elle s'achète (zones.js).
  // Trois zones : la T5 du GDD sort du jeu (gardée ici pour les anciennes sauvegardes, jamais proposée).
  locos: {
    1: { traction: 7, armor: 60, zone: 1 },
    2: { traction: 8, armor: 110, cost: { scrap: 80, parts: 40 }, zone: 1 },
    3: { traction: 10, armor: 170, cost: { scrap: 160, parts: 100 }, research: 'diesel', zone: 2 },
    4: { traction: 12, armor: 250, cost: { scrap: 300, parts: 250, know: 100 }, research: 'hybrid', zone: 3 },
    5: { traction: 14, armor: 360, cost: { scrap: 600, parts: 500, know: 300 }, research: 'fusion', zone: 99 }
  },
  maxLoco: 4
};
