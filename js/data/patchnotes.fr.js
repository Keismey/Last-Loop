// Notes de mise à jour montrées aux joueurs (menu « Nouveautés », et une fois après chaque mise à jour).
// Les plus récentes en premier ; courtes, dans la langue du jeu. Le détail technique est dans CHANGELOG.md.
export const PATCH_NOTES = [
  { v: '0.26.6', title: 'Plus facile à toucher et à lire', items: [
    'Les petits boutons (vitesse, vue, Auto, Résumé du tour, Partir, tutoriel) réagissent sur une zone plus large, sans changer d’allure.',
    'Plusieurs petits textes sont plus grands, et le bandeau « Halte » et le bouton Options de l’écran titre sont plus lisibles.'
  ] },
  { v: '0.26.5', title: 'Moins de faux déraillements', items: [
    'L’écran « Le train a déraillé » ne s’affiche plus pour une erreur qui ne vient pas du jeu (extension du navigateur, autre site) : ta partie continue.'
  ] },
  { v: '0.26.4', title: 'Ta partie est protégée', items: [
    'Si ta partie a été enregistrée par une version plus récente du jeu (sur un autre appareil, par exemple), l’écran titre te propose de mettre le jeu à jour au lieu de risquer de l’écraser.'
  ] },
  { v: '0.26.3', title: 'Le menu pendant le tutoriel', items: [
    'Pendant le tutoriel, le bouton du menu reste utilisable : tu peux faire une pause, régler le son ou retourner au hub. Gus attend derrière le menu.'
  ] },
  { v: '0.26.2', title: 'Démarrage plus rapide', items: [
    'L’écran titre s’affiche bien plus vite : les images du jeu se chargent pendant que tu le regardes.',
    'Options : bouton « Retour au hub », et le même ordre que dans les autres jeux du studio.'
  ] },
  { v: '0.26.0', title: 'Options pour tous les jeux du studio', items: [
    'Les Options s’ouvrent aussi depuis l’écran titre (volumes, vibrations, langue, notes de mise à jour, crédits).',
    'Nouveau dans le menu : signaler un bug et soutenir le studio.',
    'Le navigateur est invité à garder ta sauvegarde même quand il fait du ménage.'
  ] },
  { v: '0.25.9', title: 'Retour sans quitter l’horizontale', items: [
    'Dans l’appli installée, le jeu se verrouille à l’horizontale sans passer en plein écran : le bouton retour ouvre directement le menu au lieu d’afficher « Tourne ton téléphone ». Le bouton « Plein écran » du menu reste disponible.'
  ] },
  { v: '0.25.8', title: 'Le bouton retour, en plein écran aussi', items: [
    'En plein écran, le bouton retour ouvre maintenant le menu de pause (le jeu repasse en plein écran au toucher suivant).',
    'À l’écran titre, le bouton retour demande confirmation avant d’aller au hub Keismey Studio.'
  ] },
  { v: '0.25.7', title: 'Le bouton retour', items: [
    'Le bouton retour du téléphone ne quitte plus le jeu : il ferme la fenêtre ou le panneau ouvert, sinon il ouvre le menu de pause (un second appui reprend la partie). Depuis l’écran titre, il ramène au hub Keismey Studio.'
  ] },
  { v: '0.25.6', title: 'Le déraillement illustré', items: [
    'La carte du déraillement a son illustration.'
  ] },
  { v: '0.25.5', title: 'Comprendre un déraillement', items: [
    'Quand le train déraille, une carte raconte l’accident et ce qu’il a coûté avant le résumé du tour.',
    'Les images modifiées d’une mise à jour s’affichent tout de suite (elles pouvaient rester à l’ancienne version).'
  ] },
  { v: '0.25.3', title: 'Le drone s’anime', items: [
    'Le drone faucheur des avant-postes vole, scie les wagons et retombe en épave quand on l’abat.'
  ] },
  { v: '0.25.2', title: 'Semer la traque', items: [
    'Piller l’Avant-poste du Roi, dans La Tranchée, fait perdre ta trace à ses bandes : la traque repart de zéro.'
  ] },
  { v: '0.25.1', title: 'Camps redessinés', items: [
    'Le village, le campement nomade et le repaire de pillards sont redessinés bien à plat, posés sur la voie comme les autres lieux.',
    'Le champ récolté garde son épouvantail et montre enfin des chaumes.'
  ] },
  { v: '0.25.0', title: 'Last Loop en anglais', items: [
    'Le jeu existe maintenant en anglais. Il suit la langue de ton appareil, et le bouton « Play in English » de l’écran titre ou du menu change de langue.'
  ] },
  { v: '0.24.3', title: 'Couleurs de l’Après', items: [
    'Les tenues et les cheveux des survivants prennent des teintes plus sobres et poussiéreuses, sans couleurs fluo.'
  ] },
  { v: '0.24.2', title: 'Mécanos au lit', items: [
    'Le mécanicien dort enfin allongé dans son lit, au lieu de rester accroupi au-dessus.'
  ] },
  { v: '0.24.1', title: 'Tirs plus propres', items: [
    'Plus de trait jaune pendant les tirs : il partait souvent du mauvais endroit.'
  ] },
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
