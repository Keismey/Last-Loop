// Mesures des images du train, en unités de jeu (1 unité = 1 px CSS à l'échelle 1).
// Produites par le traitement des images Gemini : largeur, hauteur, hauteur du plancher intérieur
// (là où se tiendront les survivants), roues de la locomotive [x, y, rayon] et sortie de la cheminée.
// Les wagons sont coupés sous le châssis : leurs bogies et leurs roues sont dessinés par le code.
export const SPRITES = {
  // roof : ligne de coupe du toit (unités depuis le haut) ; une extension de toit (Grenier, Couchettes, Tourelle auto)
  //        remplace tout ce qui est au-dessus. Les wagons sans extension gardent leur toit.
  wagon_workshop: { w: 201.2, h: 92.2, floor: 79.0, roof: 13.3 },
  wagon_boiler: { w: 203.3, h: 91.1, floor: 81.6 },
  wagon_greenhouse: { w: 199.3, h: 88.2, floor: 80.7, roof: 12.0 },
  wagon_turret: { w: 205.9, h: 112.0, floor: 101.6, head: { set: 'turret_head', x: 0.556, y: 13.6, h: 26 } },
  wagon_bunk: { w: 205.9, h: 105.4, floor: 91.8, roof: 14.7 },
  wagon_gatherer: { w: 200.7, h: 89.0, floor: 80.9 },
  wagon_cargo: { w: 203.0, h: 83.3, floor: 72.8, roof: 7.2 },
  wagon_lab: { w: 203.0, h: 114.3, floor: 106.6, roof: 37.9 },        // l'antenne dépasse du toit
  wagon_foundry: { w: 203.0, h: 76.9, floor: 69.0, chimney: [50.4, 0.3] },
  // Extensions de toit : le pont arrive au bas de l'image ; couchettes : matelas (x en fraction, hauteur au-dessus du pont)
  roof_attic: { ratio: 109 / 620 },
  roof_berths: { ratio: 117 / 620, sleepers: [0.39, 0.62], mattress: 13.8 },
  roof_autoturret: { ratio: 116 / 620, head: { set: 'autoturret_head', x: 0.499, y: -10.4, h: 26 } },
  // Têtes de tourelle orientables : profil (droite), face, trois quarts (droite) ; cx = centre de l'anneau (fraction)
  turret_head: { cx: [0.31, 0.498, 0.366] },
  autoturret_head: { cx: [0.346, 0.497, 0.349] },
  // Fourgon de queue : l'éperon dépasse sous le châssis (below) ; door = porte arrière [x0, y0, x1, y1]
  wagon_caboose: { w: 205.0, h: 117.1, floor: 107.3, below: 17.1, door: [35, 50, 65, 115], bogies: [0.3, 0.8] },
  // Locomotive sans roues : roues, manetons et bielles sont animés par le code
  loco_t1: {
    w: 223.7, h: 103.1,
    rail: 104.0,                                   // ligne du rail, depuis le haut de l'image
    drivers: [[108.5, 88.7, 15.0], [67.7, 88.7, 15.0]], // roues motrices [x, y, rayon], la première côté cylindre
    small: [[187.7, 95.8, 8.2], [145.9, 96.0, 8.0]],    // petites roues avant
    crank: 7.0,        // rayon des manetons
    rod: 30.4,         // longueur de la bielle motrice (maneton → crosse)
    guideY: 86.8,      // hauteur de la glissière de la crosse
    cylinderX: 153.7,  // arrière du cylindre
    chimney: [165.9, 0.7]
  },
  // Le Bélier : 3 roues motrices (la bielle d'accouplement les relie toutes), 2 petites roues avant
  loco_t2: {
    w: 255.0, h: 113.1,
    rail: 113.1,
    drivers: [[128.2, 98.0, 15.1], [94.9, 98.0, 15.1], [59.1, 98.0, 15.1]],
    small: [[195.6, 103.8, 9.3], [152.4, 103.8, 9.3]],
    crank: 7.0,
    rod: 23.2,
    guideY: 89.4,
    cylinderX: 163.6,
    chimney: [176.6, 1.5]
  },
  // Bogie de wagon : châssis (image) + 2 roues (image), proportions en fraction de la largeur
  bogie: { w: 56, aspect: 0.2146, axles: [0.0803, 0.9189], axleY: 0.7889, wheelR: 9 },
  // Chaîne d'attelage, entre deux wagons
  coupler: { aspect: 0.797 }
};

// Dimensions de secours quand l'image n'existe pas encore
export const PLACEHOLDER_WAGON = { w: 200, h: 92, floor: 80 };
// Fourgon de queue blindé : dessiné par le code tant que l'image n'existe pas
export const CABOOSE_META = { w: 118, h: 100, floor: 90 };
export const PLACEHOLDER_LOCO = { w: 244, h: 130, chimney: [208, 0] };
