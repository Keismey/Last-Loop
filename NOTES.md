# Notes de développement

Choix faits pendant le développement, quand le GDD laissait une marge (règle d'or du §0).

## Jalon J1 — Fondations

- **Debug dans l'artefact** : l'adresse d'un artefact ne transmet pas les paramètres `?debug=1`.
  Le debug s'ouvre donc avec `#debug` à la fin de l'adresse, ou par 7 touchers sur le numéro de version dans le menu.
  `?debug=1` sera ajouté au passage sur GitHub Pages.
- **Écran « Tourne ton téléphone »** : il ne bloque que les écrans tactiles tenus droit. Sur ordinateur
  (souris), le jeu reste jouable quelle que soit la forme de la fenêtre, pour faciliter les tests.
- **Page d'accueil de l'artefact** : `index.html` est écrit sans `<!doctype>`, `<html>`, `<head>` ni `<body>`,
  car l'artefact les ajoute lui-même. Au jalon J12, ces balises seront ajoutées pour GitHub Pages
  (avec le manifeste et le service worker).
- **Locomotive provisoire** : en attendant `loco_t1.webp`, « La Braise » est dessinée par le code
  (bielles et roues animées, fumée). Elle sera remplacée automatiquement dès que l'image existera.
- **Décor provisoire** : les trois couches des Plaines de Cendre sont dessinées par le code, avec le
  même enchaînement en miroir que celui prévu pour les images Gemini.
- **Export de sauvegarde** : texte préfixé `LOOPX1:` puis base64, copié dans le presse-papiers
  (les téléchargements sont bloqués dans un artefact).
- **Rechargement à chaud** : quand l'artefact est republié pendant qu'une partie est ouverte, la partie
  est sauvegardée puis rouverte directement.
- **Rail d'onglets et panneaux du bas** : déjà en place pour valider la mise en page paysage ;
  ils indiquent le jalon où ils deviendront actifs.

## Jalon J2 — Le train vivant

- **Images Gemini traitées par Claude** : fond magenta retiré, recadrage, conversion en WebP. La locomotive
  générée regardait vers la gauche : elle a été retournée.
- **Wagons coupés sous le châssis** : Gemini a dessiné des roues sous certains wagons et pas sous d'autres.
  Toutes les images sont coupées au niveau du châssis, et les bogies sont dessinés par le code :
  le train est homogène et les roues tournent.
- **Roues de la locomotive** : chaque roue de l'image est redessinée en rotation autour de son axe.
- **Mesures des images** (largeur, hauteur, plancher intérieur, roues, cheminée) : `js/data/sprites.js`.
  Le plancher servira à placer les survivants au jalon J3.
- **Assets présents** : listés dans `AVAILABLE` (`js/data/assets.js`) ; le jeu ne demande que ceux-là.

- **Décors en bandes** : la scène est environ 3,6 fois plus large que haute, les images Gemini en 16:9.
  Chaque couche est recadrée en bande horizontale, placée par rapport au rail et étirée en largeur
  (réglages dans `js/data/backgrounds.js`). Le soleil est dessiné par le code : en miroir, il apparaissait deux fois.
- **Bielles de la locomotive** : la version actuelle fait tourner les bielles avec les roues, ce qui est faux.
  Correction prévue dès réception de la locomotive sans roues ni bielles : roues en rotation,
  bielles dessinées par le code qui restent horizontales et suivent les manetons.

## Version 0.2.3 — Paysage en profondeur

- **Netteté** (`js/render/mip.js`) : un canvas réduit mal une image de plus de 2 fois. Chaque image a donc des
  versions ½, ¼, ⅛… calculées une fois, et on dessine toujours à partir de la plus proche. Toutes les images passent
  par `drawSmooth()`.
- **Profondeur** (`js/data/landscape.js`) : un élément à la profondeur d (1 = voie, 0 = horizon) défile à la vitesse d,
  s'affiche à la taille d et se pose sur la ligne de sol de sa profondeur. Le zoom agit comme un objectif :
  tout rétrécit vers la voie et l'horizon descend.
- **Ciel** : il ne défile pas (il est à l'infini). Une seule image, à la largeur de l'écran, horizon calé.
- **Éléments dispersés** : tirage pseudo-aléatoire par case, toujours identique pour une position donnée.
  Tailles réelles : 1 m ≈ 26 unités du train (pylône 8 m, grange 6 m, arbre 7 m, clôture 1,3 m).

## Jalon J3 — Équipage et économie

- **Pas encore de ravitaillement** : les arrêts (récolte, gares) arrivent au jalon J4. En attendant, le charbon
  baisse d'environ 90 par tour de 11 min avec tout l'équipage en poste, et le train ralentit à 30 % quand il est vide.
  Le bouton debug « +1 000 de chaque ressource » permet de continuer à tester.
- **Couchages** : le Dormoir montre 4 couchettes ; au-delà, les survivants au repos dorment dans la cabine.
- **Toucher court ou double toucher** : un toucher sur la scène attend 0,3 s pour savoir si c'est un double toucher
  (zoom) avant d'ouvrir une fiche.
- **Bandeau d'équipage** : il ne montre que les survivants au repos, blessés ou critiques ; ceux en poste sont
  dans le train (et dans l'onglet Équipage).
- **Sauvegarde v2** : migration automatique des parties v1 (ajout de l'équipage).

## Jalon J4 — Aiguillages et circuit 1

- **Camps, gares et forteresse** : le train les longe sans s'arrêter (contacts et gares au jalon J6, combats au J5).
- **Voie découverte** dès qu'on s'y engage (et non à la fin) : le joueur voit tout de suite son nom sur la carte.
- **Distances** : un transit = 2 880 unités (24 s à vitesse ×1). Un tour par défaut ≈ 10 min.
- **Économie mesurée en simulation** (4 survivants, Auto, route par défaut) : −10 Charbon par tour environ ;
  Vivres en excédent ; Ferraille +35 par tour. Le Plateau de récolte sans équipage ne donne que ×0,4.
- **Halte** : au dépôt, la simulation est figée (rien ne produit ni ne consomme) ; le glisser-déposer reste actif.
- **Sauvegarde v3** : les parties précédentes reprennent au dépôt, avec le monde neuf.

## Jalon J5 — Combat

Choix faits là où le GDD laisse une marge (tous réglables dans `js/data/enemies.js`) :

- **Tourelle au milieu du convoi de départ** (Chaudière, Serre, Tourelle, Dormoir, Plateau) : avec une portée de
  3 wagons, une Tourelle en queue laissait la Chaudière sans défense. Les parties en cours sont réordonnées.
- **Bouton « Auto »** : il pourvoit d'abord un poste par wagon (Chaudière, Serre, Tourelle, Plateau), puis les
  seconds postes. Avant, les 4 survivants allaient tous à la Chaudière et à la Serre, et la Tourelle restait vide.
- **Les tourelles visent aussi les ennemis en approche** à partir de 45 % de leur course (sinon chaque ennemi
  frappe au moins une fois avant d'être touché).
- **Un wagon attaqué** produit moitié moins (Chaudière comprise) ; la Tourelle, elle, garde toute sa puissance de feu.
- **Ateliers du dépôt** (en attendant les gares du J6) : pendant la Halte, 10 Ferraille = +25 intégrité
  et 10 Ferraille = +8 Munitions. Sans eux, un déraillement entraînait une spirale (on repartait à 40 %).
- **Ruines** : +8 Munitions par récolte (un convoi éventré, une raffinerie : il en traîne).
- **Renforts de forteresse** à 20 s et 40 s d'assaut si le boss vit encore (le GDD dit « 30 % et 60 % de l'arrêt »,
  mais un assaut n'a pas de durée fixe).
- **Assaut** : action par défaut à l'approche d'une forteresse debout ; « Passer » reste possible.
- **Boss** : le Roi des Rails est un camion de guerre sur les rails, qui percute l'arrière du convoi.
- **Équilibrage mesuré en simulation** : la route par défaut se boucle sans dommage sérieux (1 à 3 vagues par tour).
  Le Corridor des pillards fait dérailler un convoi qui ne fait rien ; il se traverse avec Pleine vapeur,
  ou avec 2 canonniers. Le Roi des Rails (700 PV) est hors de portée d'un convoi de départ : il demande
  plusieurs tourelles améliorées (J6). Pour le tester : debug « Boss » et « Intégrité pleine ».
- **Sauvegarde v4** : ajout du combat et de l'intégrité.

## Jalon J6 (1re partie) — Gares et atelier du train

- **Régénération de l'intégrité** (GDD §4.5, oubliée au J5) : 0,08/s, plus 0,08/s par mécanicien d'Atelier.
- **Blindage des locomotives** repris du GDD (60, 110, 170, 250, 360).
- **Ateliers du dépôt** gardés en attendant le réseau complet de gares : ils dépannent quand on revient abîmé.
- **Recrue** : il faut un couchage libre (Dormoir ou cabine) ; gratuite si l'équipage compte moins de 3 survivants.
- **Rumeur** : un choix par tronçon, désigné par son feu (on ne connaît pas encore le nom de la voie).
- **Nouvelle locomotive** : en attendant l'image du Bélier, le train garde le dessin de La Braise.
- **Reste du jalon J6** : contacts avec les camps (commerce, aide, pillage, attitudes), contrats des gares,
  10 événements, Soute et Laboratoire visibles mais à finir de tester.

## Version 0.7 — Remplir son train (idée du manager)

- **Départ à 2 survivants** (Mécanique et Terrain) au lieu de 4 : les parties en cours gardent leur équipage.
- **Recrutement** : dépôt (1 volontaire par tour) + gares (1 par passage) ; plus tard événements et villages.
  Mesuré en simulation : 2 → 6 survivants en 4 tours, puis il faut des lits.
- **Couchettes** : module de toit exclusif avec le Grenier (choix stockage / équipage), 30 Ferraille + 5 Pièces,
  en Halte. L'Étage du GDD (T3) reste prévu pour plus tard.
- **Ordre des lits** : Dormoirs, puis Couchettes, puis cabine.

## Version 0.8 — Défense par l'équipage (idée du manager)

- **Principe** (à la Fallout Shelter) : on se bat là où on est. La Tourelle devient un renfort qu'on construit plus tard.
- **Garde automatique** : pour éviter trop de glisser-déposer en plein combat sur téléphone, un survivant au repos
  part seul défendre un wagon attaqué sans défenseur. Garder quelqu'un au repos = garder une sentinelle.
- **Part des coups** : 35 % pour les défenseurs du wagon (répartis, moins l'armure), 65 % pour l'intégrité.
- **Mesuré en simulation** (route par défaut, recrue à chaque tour) : aucun déraillement sur 6 tours, intégrité
  minimale > 80 ; quelques objets trouvés. Le Corridor des pillards au 1er tour avec 2 survivants : déraillement
  (voie à feu rouge, c'est voulu).
- **Sauvegarde v5** : inventaire et équipement.

## Version 0.9 — Combats à la Fallout Shelter (idée du manager)

- **Deux modes d'ennemis** : « infestation » (errants, faibles, entrée au hasard puis propagation aux voisins, à la
  manière des radcafards et des incendies) et « assaut » (camps, forteresse, boss : entrée par la queue, avance vers
  la locomotive quand le wagon n'est plus défendu, à la manière des pillards qui entrent par la porte de l'abri).
- **Mort** : le seuil de 40 PV empêchait de mourir au combat. Désormais seul l'état « à terre » arrête un combattant ;
  40 PV reste le seuil de la garde automatique (on n'envoie pas un blessé en renfort).
- **Garde automatique élargie** : en simulation, un wagon vide infesté (Dormoir sans dormeur) rongeait l'intégrité
  sans résistance (3 déraillements sur 12 parties). Avec le travailleur le plus proche en renfort : 0 sur 12.
- **Fourgon de queue (0.10)** : extension plutôt que 8ᵉ wagon forcé (choix validé par le manager) : pas de règle
  « doit rester en queue », il suit le dernier wagon tout seul. Pour le combat c'est la position n (après le dernier
  wagon) : tourelles et armes à distance l'atteignent naturellement. Mesuré : un assaut de camp contre un fourgon N2
  gardé coûte environ 90 de blindage et 0 d'intégrité ; 3 assauts d'un coup contre un fourgon N1 sans garde l'enfoncent
  en 18 s, puis le train déraille. Coût en Pièces : abordable vers le 3ᵉ ou 4ᵉ tour.

## Version 0.11 — Camps (J6, première partie)

- **Halte au camp** plutôt que l'arrêt de 25 s du GDD : même règle que les gares (temps figé), plus lisible sur
  téléphone. Par défaut : halte chez les alliés et pacifiques, passage ailleurs.
- **Écart au GDD (choix de Claude)** : de Pacifique à Allié, deux aides lors de deux passages au lieu d'une seule.
  Avec une seule aide de 25 Vivres, le Hameau d'Ada (sur la voie par défaut) devenait allié au premier tour et
  offrait une clé tout de suite : trop facile.
- **Fenêtre de décision** des camps : 16 s (ils réagissent 6 s avant l'arrivée ; avec 8 s on n'avait que 2 s pour
  choisir le tribut).
- **Vérifié** (simulation) : « le village trahi » du GDD se reproduit (pillé → Prudent rancunier → Méfiant déf. 1
  → Hostile déf. 2 → fortification) ; tribut payé aux Chacals ; pillage gagné à 2 survivants contre le Hameau.
- **Pas encore fait** : camp abandonné qui devient des Ruines, réoccupation [P1].

## Version 0.12 — Refonte de l'interface (demande du manager)

- **Direction** : « le pupitre du mécanicien ». Une seule audace : la plaque de tôle rivetée (4 rivets en laiton)
  pour le pupitre du bas, les panneaux et les fenêtres. Le reste est sobre : boutons en émail avec une lèvre
  (ils s'enfoncent), registres à filets, titres en sérif à empattements (pile système, GDD) en minuscules.
- **Jetons** : suie #18171c, tôle #25242b, émail #efe6cf, laiton #c4a465 (titres, filets), ambre #e8a33d (action
  principale), sarcelle #3e8e8a (Halte), rouge #c8382d, vert #8fd17e (santé, gains).
- **Ergonomie** : pied de panneau collant (Repartir toujours visible), bandeau d'équipage complet, onglet ouvert
  marqué, notifications moins envahissantes, Carnet enfin utile.
- **Événements** : environ 1,3 par tour en simulation. Le bot choisit toujours le premier choix possible : les
  Pièces montent plus vite qu'avant (le mécano blessé donne 20 Pièces). Les événements sont des bonus ; à surveiller.
- **Contrats** : livraison seulement à partir du passage suivant l'acceptation (« en repassant », GDD), sinon on
  remplissait le contrat dans la foulée. Délai affiché en numéro de tour absolu (plus clair que « encore N tours »).

## Version 0.13 — Retours du manager sur l'interface

- **Carte en boucle** : SVG en stade (deux droites, deux demi-cercles), 6 tronçons ; écart des voies 58 unités ;
  marqueurs HTML posés en pourcentage au-dessus. Les numéros de tronçon ont été retirés (ils se chevauchaient
  avec les voies intérieures) : les aiguillages J1 à J5 et le détail « Tronçon N » suffisent.
- **Contours magenta** : trois passes sur les images existantes : retrait du spill sur la bande de contour,
  encre rouge ramenée au gris brun, bruns rosés (B ≈ G) de la végétation recolorés. Les originaux sont gardés
  dans le dossier de travail.
- **Icônes en image** : `icon()` cherche `ico_<nom>` dans AVAILABLE et l'enveloppe dans un `<svg>` (les tailles
  CSS existantes s'appliquent). Les pictogrammes d'interface (fermer, menu, téléphone) restent dessinés.

## Version 0.14 — Icônes en images, sous-onglets

- 41 icônes viennent des planches Gemini du manager (128 px, fond magenta retiré). Celles qui manquent
  (menu, fermer, téléphone) restent dessinées par le code. La planche des sites avait des cases rose pâle
  sur fond magenta : clé plus large (min(R,B) − G entre 25 et 95) pour ne garder que le dessin.
- Sous-onglets génériques (`js/ui/subtabs.js`) : rangée fixe entre le titre et le contenu du panneau,
  l'onglet choisi est retenu par panneau. Équipage (Survivants, Arsenal, Fabrication), fiche survivant
  (Équipement, Compétences), gare (Trocs, Services, Contrat, Recrue), camp (Commerce, Relations, Recrue).
  Pastilles : nombre (recrues, objets) ou « ! » ambré (contrat à accepter ou à livrer, fabrication possible).
- Une gare s'ouvre toujours sur Trocs ; un camp sur Commerce s'il est ouvert, sinon sur Relations.

## Version 0.15 — Survivants en images

- 8 bases prévues : rôle (compétence principale) × sexe (les 30 premiers prénoms sont féminins). Base absente :
  pantin du code. Fichiers : `assets/img/crew_<base>.webp` (atlas) et `crew_<base>_m.webp` (masque sans perte,
  rouge = vêtement, vert = cheveux), méta dans `js/data/crewSprites.js` (généré).
- Couleurs repères dans les planches Gemini : vêtement vert #00C800, cheveux bleu #0050FF. Le jeu remplace la
  teinte et garde les ombres (saturation et valeur mises à l'échelle) avec `LOOKS.outfit` et `LOOKS.hair`
  du survivant : aucune donnée de sauvegarde en plus.
- Chaîne d'outils (bloc-notes de Claude) : `cut_free.py` (composantes connexes → personnages, petites pièces
  rattachées au plus proche ; Gemini ne respecte pas toujours la grille), `build_crew.py` (masques : cheveux
  partout où c'est bleu, vêtement seulement près des grandes zones vertes pour épargner les fanes de carotte ;
  ancre aux pieds, sol commun par rangée, réduction ×0,5), `gen_crew_js.py`.
- Poses : stand/idle, shovel, hammer, water, sort, read, aim, shoot, strike, carry (glisser : image « touché »),
  injured, sleep et critical (allongé). Hauteur debout : 50 unités du train.

## Fait en 0.22 — Combat du Roi des Rails (plan du manager)
- **Caméra** : elle suit le Roi (l'arrière pendant le bélier, puis le wagon qu'il frappe) ; la limite de défilement
  s'étend derrière le train. Le joueur reprend la main en faisant défiler (2,5 s de répit avant le suivi).
- **Phase 1, bélier** : le Roi recule (« ! » rouge sur le fourgon pendant 2,2 s), puis fonce : 40 dégâts au fourgon,
  −15 % par garde présent (60 % au plus), chaque garde encaisse 6 PV. Recul de 4,5 s, et on recommence.
- **Phase 2, hors-piste** (porte enfoncée, ou pas de fourgon) : il saute des rails, longe le train sur la voie de
  devant et frappe un wagon 7 s (dégâts ×1,1), puis un autre. Les tourelles à portée de ce wagon l'atteignent.
- **Renforts** : vagues à 25, 55 et 85 s (budget 4 × menace), plus 3 motards à 66 % et 33 % de ses PV. PV 600.
- Mesuré (`bosstest.mjs`) : tourelle à l'arrière + 2 gardes au fourgon = victoire en 70 s à traque 1 ; mal préparé
  (tourelle au milieu, sans garde, ou sans fourgon) = fuite ; à traque 6, il faut en plus une Tourelle auto ou les
  capacités (le bot ne s'en sert pas).
- Planche du Roi demandée en 6 images (roule ×2, canon, charge, saut, endommagé) : à brancher à réception.

## Plus tard — Tourelle orientable (idée du manager)

- La tête de tourelle se tourne vers sa cible : gauche (profil retourné), devant (vue de face), droite (profil).
  Prompt « Tête de tourelle » prêt (3 vues). Claude efface la tourelle peinte sur `wagon_turret` et pose la tête
  par le code.
- Planche B des survivants : deux images de plus pour les prochaines bases, « assoupi » (cabine) et « jumelles »
  (poste de tir sans arme à distance). La mécano a déjà « assoupie » (image en plus de Gemini) ; sans jumelles,
  elle reste au repos au poste de tir.

## Feuille de route (manager, 15 octobre 2026)

Ordre : 1) gameplay, mécaniques et menus, en pensant aux 3 zones et à la tension ; 2) assets hors personnages ;
3) tour d'ergonomie de tous les menus ; 4) personnages et ennemis animés (planches en pause, la mécano est faite).
Le contenu des zones 2 et 3 attend, mais leur forme est fixée maintenant pour ne pas refaire la zone 1.

### Les 3 zones (proposition de Claude, à valider)

| Zone | Grille | Boss (forteresse) | Butin du boss → équipement de traverse | Locomotive | Niveau max des wagons |
|---|---|---|---|---|---|
| 1 Plaines de Cendre | C1 actuel, 6 tronçons | Le Roi des Rails | Blindage du Roi → Refroidissement (désert) | T1 → T2 | 2 |
| 2 Désert de Verre | grille C3 du GDD, 5 tronçons | Le Mirage | Cœur du Mirage → Étrave brise-glace (toundra) | T3 | 3 |
| 3 Toundra fantôme | grille C4 du GDD, 5 tronçons + Terminus | Le Colosse de givre, puis le Train fantôme au Terminus | fin du jeu | T4 | 3 |

- La Forêt de Rouille (C2 du GDD) et l'anneau Terminus (C5) disparaissent comme zones ; le Terminus devient la
  dernière gare de la toundra. T5 disparaît (ou devient une récompense de fin).
- Traverse : l'aiguillage verrouillé (3 clés en zone 1) mène à un **atelier de traverse** ; on y fabrique
  l'équipement de zone avec le butin du boss + des ressources. Un seul emplacement « équipement de zone » sur la
  locomotive. Sans lui, la traverse reste fermée.
- On peut revenir dans une zone précédente (même atelier, sens inverse) : utile pour finir des contrats ou
  commercer, mais le monde y continue de s'épuiser.

### Tension (« survivre, pas vivre tranquille »)

Constat (simulations) : au tour 6 d'une partie bot, Combustible, Vivres et Ferraille sont à 90 % des capacités.
C'est beaucoup trop confortable. Leviers, du plus structurant au plus fin :
1. **Plafonds par zone** : niveau des wagons (2 en zone 1), traction de la locomotive, branches de recherche.
   On ne peut pas tout maximiser avant de partir, quoi qu'on fasse.
2. **La traque du Roi** : tant que le boss de la zone vit, la menace monte d'un cran à chaque tour (vagues plus
   grosses, camps de pillards plus forts). Rester trop longtemps coûte de plus en plus cher.
3. **Entretien du convoi** : au dépôt, chaque wagon coûte un peu de Ferraille et de Pièces par niveau. Un gros
   train se paie ; démanteler devient un vrai choix.
4. **Rareté** : capacités de départ plus basses, rendements des sites en baisse, repousse plus lente, consommation
   de Vivres par survivant un peu plus haute ; famine prolongée → départs ou morts.
5. **Événements** plus souvent négatifs, avec des choix coûteux.
Cibles mesurées au bot : réserves moyennes 30 à 60 % des capacités, au moins un manque par tour, aucune
ressource au plafond plus d'un tour ; zone 1 terminée en 1 h 15 à 1 h 45 ; au départ vers le désert :
T2, 6 à 8 wagons surtout niveau 2, 6 à 10 survivants.

### Fait en 0.17
- `js/data/zones.js` et `js/sim/zones.js` : zones, plafonds, butin, équipement de zone, traque, entretien.
  `state.progress` (zone max, équipement monté, matériaux, boss tombés, tour d'arrivée par zone). Sauvegarde v7.
- Bot « joueur actif » (`balance.mjs` dans le bloc-notes) : construit (Plateau d'abord), recrute, troque, choisit
  ses voies et ses récoltes, gère l'Atelier. Résultats après réglage (3 parties, 10 tours) : Combustible 30 à 85 %,
  Vivres 20 à 60 %, Ferraille 15 à 40 % (dépensée), aucun déraillement avec une Tourelle ; 6 à 7 wagons au tour 10.
  Ouverture décisive : un joueur qui construit l'Atelier avant le Plateau étouffe (Ferraille à 0).
- À surveiller en jeu réel : la traque (peut-être trop douce pour un joueur prudent), la réserve du dépôt
  (40 Combustible et Vivres offerts chaque tour, filet de sécurité qui atténue la tension).

### Fait en 0.20 (tour du jeu, 15/10)
- **Aucun game over** (décision du manager) : sous 3 survivants, plus personne ne meurt (les derniers restent à terre
  et se soignent au dépôt) ; au départ du dépôt, l'intégrité est toujours remontée à 30 % au moins ; sans charbon,
  le train avance encore à 30 % ; la réserve du dépôt (40 Combustible et Vivres) reste.
- **Tension** : la traque durcit aussi chaque ennemi (+6 % de PV par cran) ; régénération de l'intégrité baissée
  (0,05 + 0,06 par mécanicien) ; errants un peu plus fréquents. Bot (3 parties, 12 tours) : Combustible et munitions
  qui s'épuisent vers les tours 9 à 12, intégrité qui tombe sous 20 % en fin de partie, un déraillement : la traque
  pousse enfin vers le Roi.
- **Tourelle auto en extension de toit** (idée du manager) : 3 au plus, 3 ⚡ chacune, 7 dégâts/s. Les extensions
  (Grenier, Couchettes, Tourelle auto) auront leur propre plancher : à l'intégration des images, mesurer la ligne de
  toit de chaque wagon, couper l'image au-dessus et poser l'extension à la place.
- **Son** : bruitages synthétisés (`js/audio/`), roulement du train au rythme de la vitesse ; lecteur de musique
  prêt (pistes à ajouter dans `AVAILABLE_MUSIC`). Options : volumes, vibrations, conseils de Gus (réglages hors
  sauvegarde). « Nouvelle partie » du menu devient « Écran titre » ; on efface sa partie depuis l'écran titre.
- **Tutoriel** guidé par Gus (sert d'intro) et conseils contextuels (une fois chacun). Gus est un visage provisoire
  en SVG en attendant sa planche.
- **Traverse** : panneau grisé « Prochainement » tant que la zone 2 n'est pas dans le jeu. Le jeu sera déployé une
  fois la zone 1 terminée.

### À poser dès maintenant dans le code (pour ne pas repasser sur la zone 1)
- Données de zone : modificateurs de biome (consommation, repousse, météo), ennemis, événements propres, prix.
- Butin de boss (matériaux) et atelier de traverse, emplacement d'équipement de zone sur la locomotive.
- Carte multi-zones (passage de traverse, dépôt par zone), sauvegarde et résumé du hub par zone.
- Recherche (J7) en trois paliers liés aux zones ; objectifs ; tutoriel ; fin du jeu.
- Entretien, traque et rareté réglés par `balance.js`, vérifiés par simulation.

### Zones : détails déjà notés
- À chaque traverse, un atelier équipe la locomotive pour la zone suivante (refroidissement pour le désert,
  brise-glace pour la toundra). L'équipement se fabrique avec un matériau pris au boss de la zone : il faut le battre
  pour partir. Seule une pièce posée à l'avant (étrave, radiateurs) change à l'image.

## Mise en ligne (checklist du manager)
1. ~~Combat du Roi des Rails, assets des survivants et des ennemis~~ (0.23.0). Reste : partie complète de test.
2. ~~Écran Crédits~~ (0.23.0).
3. ~~Version installable~~ (0.23.0) : `manifest.webmanifest`, `sw.js` (régénéré à chaque mise en ligne), balises `<html>`/`<head>`
   ajoutées à la copie GitHub par le script de déploiement.
4. **Cloudflare Web Analytics** (même balise que le hub, avant `</body>`, version GitHub seulement) :
   `<!-- Cloudflare Web Analytics --><script type='module' src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "cdb82226cd1b401d9e4f4e899f9b8425"}'></script><!-- End Cloudflare Web Analytics -->`
   Le hub affiche « Mesure d'audience anonyme (Cloudflare), sans cookie » : mettre la même mention dans les Crédits.
5. Dépôt GitHub **Last Loop** (créé par le manager), GitHub Pages.
6. **Ajout au hub keismey.github.io** : un bloc dans `games.js` (id, name, genre, tagline, path `/Last-Loop/` selon le nom
   du dépôt, repo, cover paysage, focus, color, accent, progress qui lit la sauvegarde `loopexpress.save` en lecture seule).

## Points ouverts

- Polices : le GDD impose les polices système. Le titre utilise une pile « slab » (Rockwell, Roboto Slab…)
  qui retombe sur Georgia si rien n'est installé. À revoir si le rendu sur téléphone déçoit.
