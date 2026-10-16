// Paysage en profondeur (GDD §14.3), réglages par anneau.
// Chaque élément a une profondeur d : 1 = au niveau de la voie, 0 = horizon.
// Un élément à la profondeur d défile à la vitesse d et s'affiche à la taille d (perspective) ;
// le zoom de la caméra s'applique à tout le paysage, comme à un vrai objectif.
// Tailles en unités du train : un wagon mesure environ 90 unités de haut (1 m ≈ 26 unités).
export const LANDSCAPE = {
  horizon: 0.5,   // hauteur de l'horizon en vue proche, en fraction de la scène

  // Hauteur réelle des éléments de décor (unités du train ; 1 m ≈ 26 unités)
  decoHeights: {
    deco_pylon: 205, deco_barn: 150, deco_tree: 185, deco_fence: 34, deco_windpump: 235,
    deco_car: 40, deco_house: 195, deco_tractor: 72, deco_rocks: 34, deco_tower: 230
  },

  rings: {
    1: {
      // Ciel : dégradé (couleurs prises dans l'image Gemini), soleil fixe et nuages qui dérivent au vent.
      sky: { top: '#df983d', horizon: '#e9af59' },
      sun: { x: 0.78, height: 0.62, r: 0.085, color: '#f7ecc8', glow: 'rgba(250,236,190,' },
      clouds: {
        count: 10,          // nuages sur une « boucle » de ciel
        period: 2.6,        // longueur de la boucle, en largeurs d'écran
        wind: 6,            // dérive due au vent (px par seconde)
        parallax: 0.03,     // défilement quand le train avance
        fill: '#ebba76', shade: '#cc945a', outline: '#4a3a33'
      },
      // Bande d'horizon (plaine et silhouettes lointaines) : bas de l'image Gemini, sans son ciel.
      // Une seule fois sur la largeur de l'écran, horizon calé ; le haut se fond dans le dégradé.
      far: { id: 'bg_c1_far', horizonFrac: 0.6875, cropTop: 0.545, fade: 0.09 },
      // Collines : bande d'image, posée sur la ligne de sol de leur profondeur
      hills: { id: 'bg_c1_mid', depth: 0.3, height: 230, baseFrac: 0.776 },
      // Sol proche : son bord supérieur est à la profondeur topDepth, il défile avec la voie
      ground: { id: 'bg_c1_near', topDepth: 0.8, height: 62, topFrac: 0.189 },
      // Éléments dispersés le long de la voie. Monde post-apocalyptique : beaucoup de vide.
      // Chaque rangée est découpée en cases ; un « paquet » mélangé décide du contenu de chaque groupe de cases
      // (« null » = case vide). Un même élément ne revient pas avant `gap` cases.
      rows: [
        {
          // Plaine : granges, maisons, pylônes… à des distances variées
          depth: [0.38, 0.62], cell: 380, gap: 4,
          deck: ['deco_pylon', 'deco_pylon', 'deco_tree', 'deco_tree', 'deco_barn', 'deco_house', 'deco_tower',
            'deco_windpump', 'deco_tractor', 'deco_car', 'deco_rocks',
            null, null, null, null, null, null, null, null, null, null, null]
        },
        {
          // Bord de voie : clôtures, rochers, épaves (devant le sol proche)
          depth: [0.88, 0.92], cell: 420, gap: 3, front: true,
          deck: ['deco_fence', 'deco_fence', 'deco_rocks', 'deco_rocks', 'deco_car', null, null, null, null, null, null, null]
        }
      ]
    }
  }
};
