// État partagé du glisser-déposer (lu par le dessin de la scène, écrit par l'interface).
export const drag = {
  active: false,
  survivor: null,     // survivant saisi
  x: 0, y: 0,         // position du doigt (écran)
  hoverSlot: null,    // poste survolé dans la scène
  hoverBunk: null,    // Dormoir survolé (repos / sauvetage)
  hoverRepair: null,  // wagon en panne survolé (réparation)
  hoverDefend: null,  // wagon attaqué survolé (renfort)
  overBar: false      // au-dessus du bandeau d'équipage
};
