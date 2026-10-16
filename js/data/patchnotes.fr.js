// Notes de mise à jour montrées aux joueurs (menu « Nouveautés », et une fois après chaque mise à jour).
// Les plus récentes en premier ; courtes, dans la langue du jeu. Le détail technique est dans CHANGELOG.md.
export const PATCH_NOTES = [
  { v: '0.24.0', title: 'Retours de partie', items: [
    'Le Roi des Rails a sa propre musique.',
    'Le fourgon blindé se construit dès la zone 1, et sa fiche dit ce qui manque.',
    'Flèches ◀ ▶ autour du nom pour passer d’un survivant à l’autre.',
    'Les survivants se tournent vers l’ennemi qu’ils visent.',
    'Démantèle les objets que personne ne porte pour récupérer des matériaux.',
    'Vue convoi plus large, vitesse réelle affichée, ennemis qui courent plus souplement.'
  ] },
  { v: '0.23.8', title: 'Fiches et compétences', items: [
    'Dans la fiche d’un survivant, glisse à gauche ou à droite pour passer au suivant.',
    'L’onglet Équipage montre les quatre compétences de chacun, la meilleure en grand.'
  ] },
  { v: '0.23.7', title: 'Pastilles à jour', items: [
    'La pastille d’un survivant affiche sa meilleure compétence, et change dès qu’il gagne un niveau.'
  ] },
  { v: '0.23.6', title: 'Ruines à leur image', items: [
    'Le Convoi éventré et la Raffinerie abandonnée ont enfin leur propre dessin.',
    'Deux lieux renommés : la Casse de la carrière et les Potagers calcinés.'
  ] },
  { v: '0.23.5', title: 'Motard et campements', items: [
    'Le motard reste sur sa moto, qui ne change plus de taille d’une image à l’autre.',
    'Les ennemis ne sursautent plus à chaque tir de tourelle.',
    'Les campements nomades et les villages sont bien posés au sol.'
  ] },
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
