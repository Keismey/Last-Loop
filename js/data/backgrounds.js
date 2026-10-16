// Placement des couches de décor Gemini dans la scène (GDD §15.4).
// Les images sont des bandes horizontales recadrées. La scène est beaucoup plus large que haute
// (environ 3,6 pour 1) : chaque bande est étirée en largeur (stretch) pour espacer les répétitions.
//  h       : hauteur de la bande, en fraction de la hauteur de scène
//  place   : 'top' (collée en haut), 'aboveRail' (bas de la bande = rail + offset), 'rail' (railFrac sur le rail)
export const BACKGROUNDS = {
  far: { h: 0.95, place: 'top', stretch: 1.15 },
  mid: { h: 0.48, place: 'aboveRail', offset: 0.0, stretch: 1.25 },
  near: { h: 0.46, place: 'rail', railFrac: 0.689, stretch: 1.3 }
};

// Soleil dessiné par le code (il ne défile pas, comme dans la réalité)
export const SUN = {
  1: { x: 0.8, y: 0.17, r: 0.075, color: '#f7ecc8', glow: 'rgba(250,236,190,' }
};
