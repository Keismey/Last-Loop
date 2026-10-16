// Notes de mise à jour montrées aux joueurs (menu « Nouveautés », et une fois après chaque mise à jour).
// Les plus récentes en premier ; courtes, dans la langue du jeu. Le détail technique est dans CHANGELOG.md.
export const PATCH_NOTES = [
  { v: '0.23.4', title: 'Portraits recadrés', items: [
    'Les portraits des survivants (pastilles et fiches) sont tous cadrés pareil, centrés sur le visage.'
  ] },
  { v: '0.23.3', title: 'À l’horizontale depuis le hub', items: [
    'Ouvert depuis le hub installé, le jeu passe bien à l’horizontale.',
    'Écran « Tourne ton téléphone » : un bouton pour passer à l’horizontale d’un toucher.'
  ] },
  { v: '0.23.2', title: 'Comme les autres jeux du studio', items: [
    'Logo Keismey Studio au lancement (touche l’écran pour passer).',
    'Les nouveautés s’affichent une fois après chaque mise à jour, et restent dans le menu.',
    'Le jeu se met à jour tout seul quand une nouvelle version est en ligne.'
  ] },
  { v: '0.23.1', title: 'Première mise en ligne', items: [
    'Last Loop rejoint le hub Keismey Studio et s’installe sur l’écran d’accueil.',
    'Les survivants dorment vraiment allongés dans leurs lits.'
  ] },
  { v: '0.23.0', title: 'Tout l’équipage en images', items: [
    'Les huit survivants et tous les ennemis sont dessinés et animés.',
    'Le Roi des Rails roule, charge, saute des rails, tire et brûle quand il faiblit.',
    'Un déraillement fait reculer la traque : les bandes perdent ta trace.',
    'Écran des crédits, et le jeu marche hors ligne une fois chargé.'
  ] },
  { v: '0.22.0', title: 'Le combat du Roi des Rails', items: [
    'Phase 1 : il enfonce le fourgon blindé à coups de bélier. Place des gardes pour amortir le choc.',
    'Phase 2 : il saute des rails et longe le train. Les tourelles bien placées font la différence.'
  ] }
];
