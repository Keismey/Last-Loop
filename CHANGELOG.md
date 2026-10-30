# Journal des versions

## 0.26.6 — Boutons à 44 px et textes lisibles

- **Zones de toucher** : `::before` invisible de 44 × 44 px au moins sur `.btn-small`, `.btn-depart`, `.chip-speed`, `.chip-zoom`, `.chip-auto` (dessin inchangé). Boutons du Dépôt (`.sb-shop-btn`) : la place manque dans l'en-tête du pupitre, la zone va du bord du pupitre aux cartes de voie (34 px).
- **Textes** : 12 px au moins pour les noms de l'équipage, les actions et la réserve du pupitre, les boutons du Dépôt, les fiches, la carte et le résumé. Exceptions : libellés du rail (10 px, « Recherche » ne tient pas plus grand dans 60 px), sous-titres des cartes de voie (11 px), pastilles de chiffres.
- **Contrastes** : bandeau Halte sur sarcelle foncée (5,4:1), boutons secondaires de l'écran titre sur fond sombre.
- **Mise à jour** : `updateNow()` ne touche au service worker que sur le site en ligne (`ON_PAGES`) ; dans l'aperçu, la page se recharge sans erreur.

## 0.26.5 — Écran de plantage réservé aux erreurs du jeu

- **Erreurs** : `error` et `unhandledrejection` n'appellent `crash()` que pour une erreur du jeu (objet d'erreur venant d'un fichier du site, `fromGame()`). « Script error. » d'un script d'un autre site (mesure d'audience Cloudflare), extensions du navigateur, avertissement « ResizeObserver loop » sans objet d'erreur, rejets sans pile du site : seulement `console.warn`, la partie continue. La pile est lue sans le message (qui peut citer l'adresse du site). Page sans origine web (aperçu en artefact) : toute erreur compte, comme avant.
- **Sauvegarde** : le message « partie plus récente » peut revenir après une sauvegarde réussie (`tooNewTold` remis à zéro).

## 0.26.4 — Une partie plus récente n'est plus écrasée

- **Sauvegarde** : une partie enregistrée par une version plus récente (`version > STATE_VERSION`, par exemple synchronisée depuis un autre appareil pendant qu'on joue une ancienne copie hors ligne) était ignorée par `loadGame()` : « Continuer » lançait une nouvelle partie et l'enregistrait par-dessus. Désormais `saveTooNew()` : l'écran titre propose « Mettre à jour » (`updateNow()`, aussi utilisé par le bandeau de mise à jour) et « Nouvelle partie » (double confirmation, inchangée) ; `saveGame()` n'écrit jamais par-dessus une telle partie, et si elle apparaît en cours de partie (synchro), un message le dit une fois (`save.tooNew`). Reprise à chaud : retour à l'écran titre au lieu de rester sur le chargement.
- **Tutoriel** : plus de second `teardown()` quand le tutoriel se termine pendant `place()`.

## 0.26.3 — Le menu pendant le tutoriel

- **Tutoriel** : le bouton ☰ reste touchable au-dessus des panneaux bloquants (`body.tuto-on #btn-menu`, `--z-tuto`). Quand une fenêtre est ouverte ou qu'on revient à l'écran titre (`api.modalOpen()`, `api.inGame()`), le tutoriel se cache et attend : la bulle de Gus ne recouvre plus le menu. Au retour, il reprend l'étape de la partie en cours ; une partie importée sans tutoriel le referme proprement (`teardown()`, la pause du tutoriel est levée).

## 0.26.2 — Options dans l'ordre commun, bouton « Retour au hub »

- **Menu** : ordre commun aux jeux du studio (son et vibrations, langue, sauvegarde, puis notes, crédits, écran titre, bug, soutien) et bouton « Retour au hub » (`KSBack.toHub()`, après `persist`).
- Notes de mise à jour joueur pour 0.26.1 et 0.26.2.

## 0.26.1 — Premier lancement plus léger

- **Chargement** : l'écran titre n'attend plus que son illustration (`title_keyart`, groupe `title`). Les images du jeu (`boot`) se chargent pendant l'écran titre ; « Jouer » montre l'écran de chargement s'il en manque encore.
- **Hors ligne** : `sw.js` est enregistré une fois ces images chargées, et les relit en `no-cache` (revalidation) au lieu de `reload` : la copie hors ligne reprend les images déjà chargées au lieu de tout retélécharger (environ 8 Mo de moins à la première visite).

## 0.26.0 — Options communes aux jeux du studio

- **Écran titre** : un bouton « Options » remplace « Crédits » et « Play in English » (ils sont dans les Options). `openMenu({ atTitle: true })` : sans temps de jeu, sauvegarde ni « Écran titre » (la croix ferme).
- **Menu** : « Signaler un bug » (formulaire du hub prérempli, `KS.bug`) et « Soutenir le studio » (Ko-fi, `KS.support`), via `js/ks-studio.js` (commun aux jeux, demande aussi le stockage persistant).
- Libellés harmonisés : « Bruitages », « Notes de mise à jour », « v… · Keismey Studio ».

## 0.25.9 — Retour sans quitter l'horizontale

- **Appli installée** (hub ou jeu, `display-mode: standalone`) : verrou paysage seul, sans plein écran (plein écran seulement si le verrou échoue). Le retour d'Android ne sert plus à quitter le plein écran, ce qui libérait le verrou et affichait « Tourne ton téléphone ».
- Sortie du plein écran en appli installée : le verrou est redemandé tout de suite. Bouton « Plein écran » du menu : `goFullscreen()` (vrai plein écran, à la demande).
- Onglet du navigateur : inchangé (le verrou exige le plein écran ; après un retour, l'écran « Tourne ton téléphone » propose de repasser à l'horizontale).

## 0.25.8 — Le bouton retour, en plein écran aussi

- **Plein écran** : Android consomme le premier retour pour quitter le plein écran sans prévenir la page ; `fullscreenchange` (sortie non suivie d'un `popstate`) est traité comme un retour (menu de pause), et le verrou paysage est remis à zéro pour que le toucher suivant redemande le plein écran.
- **Écran titre** : le retour demande confirmation avant d'aller au hub (`confirmHub()`).
- `ks-back.js` : n'empile plus d'entrées d'historique sur un clic simulé par le jeu (Chrome les sautait ensuite et le retour faisait sortir du jeu).

## 0.25.7 — Le bouton retour

- **Bouton retour du téléphone** (`js/ks-back.js`, fichier commun aux jeux du hub ; `onBack()` dans `main.js`) : ferme la fenêtre (sauf les cartes verrouillées), puis le panneau latéral ; en partie, ouvre le menu de pause (un second retour reprend) ; à l'écran titre, ramène au hub. `isModalLocked()` ajouté à `ui/modal.js`.

## 0.25.6 — Le déraillement illustré

- **Illustration** ev_derail (Gemini) sur la carte du déraillement.

## 0.25.5 — Comprendre un déraillement

- **Déraillement** : carte façon événement (illustration ev_derail, en attente : ciel et pictogramme en attendant)
  avec le récit, les pertes, la santé de l'équipage, l'intégrité et la traque qui recule ; « Au dépôt » ouvre ensuite
  le résumé du tour (`ui/derailCard.js`).
- **Service worker** : les images sont rangées sous leur empreinte (md5) ; une image modifiée sous le même nom est
  retéléchargée à la mise à jour, les anciennes sont retirées. Avant, le rafraîchissement en fond pouvait remettre une
  vieille copie (cache HTTP) : les nouveaux camps restaient invisibles chez certains joueurs.

## 0.25.4 — Debug : drones

- **Debug** : bouton « Drones » (vague de drones faucheurs seuls). Rien ne change pour les joueurs.

## 0.25.3 — Le drone s'anime

- **Drone faucheur** : planche animée (vol, scie, touché, épave). Images calées sur l'œil rouge (le corps ne saute
  pas quand la scie bouge). Abattu au-dessus du train, l'épave reste sur le toit ; abattu à l'approche, elle tombe au sol.

## 0.25.2 — Semer la traque

- **Traque** : piller l'Avant-poste du Roi (La Tranchée, `huntReset` sur le camp) la remet à zéro (`resetHunt`) ;
  elle remonte ensuite d'un cran par tour. Le choix « Piller » l'annonce, la bulle de la traque et le conseil de Gus
  le rappellent. Le déraillement la fait toujours reculer de 2 crans.
- **Planche à faire** : drone faucheur animé (8 images).

## 0.25.1 — Camps redessinés

- **Lieux** : nouvelles images à plat (retouches Gemini de lieux déjà à plat) pour le village et les nomades (normal et
  fortifié), le repaire de pillards normal (calé sur le fortifié) et le champ récolté (calé sur le champ plein).
  Détourage sur la « magentitude » min(R, B) − G (fond magenta terne de certaines images), sans reste de violet.
  `CAMP_ART` : village et nomades à 175 unités, sink 0,02.

## 0.25.0 — Last Loop en anglais

- **Langue** : `?lang=fr|en` (liens du hub) est retenu ; sinon le dernier choix ; sinon la langue de l'appareil
  (`LANG` dans core/i18n.js, même règle que Pas ce soir). Bouton « Play in English » / « Jouer en français » sur
  l'écran titre et dans le menu (la partie est sauvegardée avant de recharger).
- **Textes** : texts.en.js (toutes les clés de texts.fr.js, une clé absente retombe sur le français), notes de mise à
  jour en anglais (patchnotes.en.js), noms des lieux (places.en.js, aussi appliqué aux noms déjà écrits dans le
  journal), surnoms des survivants traduits à l'affichage (gardés en français dans la sauvegarde).
- **Nombres** : séparateurs, décimales et pourcentages selon la langue (`num`, `dec`, `fixed`, `pct`).

## 0.24.4 — Debug : miliciens

- **Debug** : bouton « Miliciens » (vague de miliciens seuls). Ils ne viennent sinon que des villages et avant-postes
  hostiles (`CAMP_POOLS`). Rien ne change pour les joueurs.

## 0.24.3 — Couleurs de l'Après

- **Palette des survivants** : tenues et cheveux en teintes délavées (le cyan, le vert clair et le lilas sortaient de
  l'ambiance). Deux tenues de plus (kaki, anthracite), ajoutées en fin de liste pour garder les sauvegardes.
- **Recoloration** : saturation et luminosité plafonnées (les reflets du vert repère viraient au fluo) ; la planche du
  mécanicien, plus claire que les autres, a une valeur de référence relevée (`clothRefV`).

## 0.24.2 — Mécanos au lit

- **Sommeil du mécanicien** : sa pose de sommeil était une image accroupie (tête dans les mains), qui flottait
  au-dessus des lits. Il dort maintenant allongé, comme la mécanicienne. Le col de son vêtement, resté vert sur cette
  image, prend la couleur de sa tenue (`clothMin` par planche dans build_crew.py).

## 0.24.1 — Tirs plus propres

- **Combat** : retrait du trait jaune des tirs (tourelles et survivants) et de son point d'impact. Il partait du corps
  des survivants ou du pare-chocs du boss et n'apportait pas d'information fiable. Les dégâts restent visibles par les
  barres de vie et les grimaces des ennemis.

## 0.24.0 — Retours de partie

- **Fourgon blindé** : toucher le fourgon pas encore construit ouvrait la locomotive. Il ouvre maintenant sa fiche,
  avec le bouton Construire et, en clair, ce qui manque (Halte ou matériaux). Il se construit dès la zone 1 (la loco T3
  n'est pas nécessaire).
- **Fiche survivant** : le glisser (peu fiable sur téléphone) est remplacé par deux flèches ◀ ▶ de part et d'autre du
  nom (`openPanel` : `onNav`).
- **Combat** : les survivants se tournent vers leur cible (tirs et coups) ; contre un ennemi accroché à leur propre
  wagon, ils gardent leur sens (pas d'aller-retour). Le trait de tir part du bon côté.
- **Course des ennemis** : les images de course sont calées sur la tête et non plus sur les pieds (le coureur glissait
  de 50 px d'une image à l'autre).
- **Démanteler** un objet de l'arsenal que personne ne porte : 40 % de sa valeur en Ferraille, plus des Pièces pour
  les objets peu courants et rares (deux touchers pour confirmer).
- **Vue convoi** (dézoom) : on peut aller environ un wagon plus loin de chaque côté.
- **Vitesse affichée réelle** : énergie × pleine vapeur × tempête / voie / surchauffe, en orange ou en vert, avec
  l'effet en cours et son compte à rebours.
- Postes de travail ramenés à l'intérieur des wagons (Chaudière, Serre, Collecteur, Atelier, Labo, Fonderie, Fourgon).
- Animations plus posées : marteau et pelle ralentis.
- Cheveux : le bleu repère qui restait sur les mèches fines (mécano, guetteuse…) est recoloré.
- **Musique du Roi des Rails** (Gemini) pendant tout le combat contre le boss.
- Boss : plus de pixels violets sur l'image du saut ; liseré violet des contours neutralisé sur tous les ennemis.

## 0.23.8 — Fiches qui glissent, compétences dans l'équipage

- **Fiche survivant** : glisser à gauche ou à droite passe au survivant suivant ou précédent (dans l'ordre de
  l'équipage, en boucle), avec « ‹ 2 / 5 › » sous l'état. `openPanel` accepte `onSwipe` (le clic qui suit un glissé
  est ignoré) et `slide` (petite animation d'entrée).
- **Onglet Équipage** : chaque ligne montre les quatre compétences, de la meilleure à la moins bonne (`sortedSkills`) ;
  la ou les meilleures en grand, les autres en petit. Le nom prend moins de place, la santé et les compétences
  remontent vers la gauche.
- Onglet Équipage : une ligne rappelle le nombre de trousses de soins, où on les utilise et où on les fabrique.

## 0.23.7 — Pastille de compétence à jour

- La pastille des survivants (bandeau du bas) se met à jour dès qu'un survivant gagne un niveau (elle ne changeait
  qu'au prochain changement de poste).
- Elle montre sa **meilleure compétence** (icône et niveau), plus seulement celle d'origine : à égalité, la compétence
  d'origine reste affichée ; entre deux autres à égalité, celle qui a atteint ce niveau la première (`topSkill`, `s.lvlAt`).

## 0.23.6 — Ruines à leur image

- **Convoi éventré** et **Raffinerie abandonnée** ont leur propre image (planche Gemini) au lieu de la maison en ruine
  commune aux ruines. Un lieu peut maintenant avoir une image à lui (`art` dans `circuits.js`, `SITE_ART`), sinon
  celle de son type.
- Deux lieux renommés pour coller à leur image : Carrière sèche → **Casse de la carrière**, Verger calciné →
  **Potagers calcinés**.

## 0.23.5 — Motard et campements

- **Motard** : son image « touché » est à pied, il semblait sauter de sa moto et y remonter à chaque coup reçu ;
  il ne grimace plus à moto. Les trois images de moto (dessinées à des tailles un peu différentes par Gemini) sont
  ramenées à la même taille et calées entre les deux roues : la moto ne gonfle plus et ne glisse plus. Cadence ralentie.
- Les autres ennemis grimacent au plus une fois toutes les 2,5 s, et seulement accrochés au train (plus de sursauts
  en pleine course sous le feu des tourelles).
- **Campements** posés au sol : nomades et villages étaient dessinés un peu en perspective (tentes et maisons plus
  haut que le bas de l'image) ; l'image descend sous la ligne du sol (`CAMP_ART.sink`, mesuré sur chaque image).

## 0.23.4 — Pas de debug en ligne, portraits recadrés

- Portraits des survivants (pastilles et fiches) : même cadrage pour les huit bases, centrés sur le visage.
- La version GitHub n'a plus de mode debug : `#debug` et les 7 touchers sur la version sont désactivés
  (`DEBUG_ALLOWED` passé à false par `tools/make_gh.py`). L'aperçu et le local le gardent.

## 0.23.3 — Paysage depuis le hub

- Le plein écran et le verrou paysage étaient demandés sur `pointerdown`, qui ne compte pas comme un geste sur écran
  tactile : le navigateur refusait, et le jeu restait coincé dans la fenêtre portrait du hub installé. Désormais sur
  `pointerup` (3 essais max), avec verrou paysage direct en mode installé.
- Écran « Tourne ton téléphone » : bouton « Passer à l’horizontale ». Le bouton Plein écran du menu verrouille aussi le paysage.
- Hub : manifeste passé en orientation libre (il imposait le portrait à tous les jeux ouverts dans sa fenêtre).

## 0.23.2 — Aligné sur les autres jeux du studio

- **Logo Keismey Studio** au lancement (toucher pour passer), comme les autres jeux.
- **Nouveautés** : notes de mise à jour pour les joueurs (`js/data/patchnotes.fr.js`), dans le menu et affichées une
  fois à l'écran titre après chaque mise à jour.
- **Mise à jour automatique** : `version.json` lu à l'ouverture et au retour dans l'appli ; à l'écran titre, le jeu
  se recharge seul ; en partie, un bandeau propose la mise à jour (la partie est sauvegardée avant).
- Service worker : pré-cache relu sans le cache HTTP, code revalidé à chaque ouverture, `version.json` jamais en cache.
- Icône « maskable » (Android), zoom du navigateur bloqué, pas d'invite d'installation (l'appli à installer est le hub).

## 0.23.1 — Première mise en ligne

- Les six survivants dessinés « recroquevillés debout » dorment maintenant vraiment allongés (nouvelles images) ;
  le cultivateur et le savant ont leur propre image « à terre ».
- Le jeu est en ligne sur GitHub Pages et dans le hub Keismey Studio, installable sur l'écran d'accueil.

## 0.23.0 — Tout l'équipage et les ennemis en images

- **Les cinq derniers survivants** sont en images : le cultivateur, la guetteuse, le guetteur, la savante et le
  savant. Les huit bases (rôle × sexe) ont maintenant leurs 23 images, recolorées pour chaque survivant.
- Les survivants qui dorment sont allongés dans leur lit ; ceux à terre sont étendus au sol.
- **Ennemis animés** : le motard (roule, fouette de sa chaîne), le coureur (court, lance sa pique), la brute (marche,
  abat sa masse), le milicien (marche, épaule et tire). Chacun grimace quand il est touché et tombe au lieu d'exploser.
  Un ennemi abattu pendant son approche tombe là où il était.
- **Le Roi des Rails animé** : il roule, charge le fourgon (étincelles), saute des rails, tire du canon en longeant
  le train, et brûle en fumant sous le tiers de ses PV.
- **Équilibrage** : un déraillement fait reculer la traque de 2 crans (les bandes perdent la trace du convoi) : un
  convoi à bout de souffle peut se refaire avant d'aller affronter le Roi.
- **Crédits** (écran titre et menu).
- **Version installable** prête pour la mise en ligne : manifeste, service worker (le jeu marche hors ligne une fois
  chargé), activés seulement sur GitHub Pages.

## 0.22.1 — Nouveaux survivants en images

- **Le mécano** et **la cultivatrice** rejoignent la mécano : 23 images chacun (travail, combat, repos, à terre,
  jumelles), recolorés pour chaque survivant (vêtement et cheveux).
- **La mécano** a maintenant son image aux jumelles (poste de tir sans arme à distance).
- Survivants à terre : ils sont maintenant allongés sur le dos (et non plus endormis).

## 0.22.0 — Le combat du Roi des Rails

- **La caméra suit le Roi** : elle part à l'arrière quand il arrive, puis le suit le long du train. On peut toujours
  faire défiler à la main ; le suivi reprend après quelques secondes.
- **Phase 1, le bélier** : le Roi recule, un « ! » rouge s'allume sur le fourgon blindé, puis il fonce dedans.
  Chaque garde placé dans le fourgon amortit le choc. Seules les tourelles proches de la queue l'atteignent.
- **Phase 2, hors des rails** : la porte cède (ou il n'y a pas de fourgon) ; il saute des rails et longe le train
  pour frapper un wagon après l'autre. La place des tourelles dans le convoi compte.
- **Renforts** réguliers depuis la forteresse, et ses motards à 66 % et 33 % de ses PV. Le Roi a 600 PV (au lieu de 700).
- Gus donne un conseil à sa première apparition.

## 0.21.2 — Cabine libérée, moral expliqué

- **Menu** : il ne dépasse plus de l'écran (téléphone tenu droit ou petit écran) ; son contenu défile, et les
  réglages passent sur deux colonnes quand la hauteur manque.

- **La cabine de la locomotive n'est plus un couchage** (−2 lits). Au départ : 2 survivants pour 4 lits du Dormoir ;
  au-delà, il faut des Couchettes ou un Dormoir amélioré. Les parties en cours gardent leur équipage : ceux qui
  n'ont plus de lit dorment par terre (moral −12) jusqu'à ce qu'on en construise.
- **Moral** : plus de choses le font bouger. Pas assez de lits −12, un compagnon qui meurt −15 d'un coup, une vague
  repoussée +3, un camp pillé ou une forteresse prise +8. La fiche du survivant affiche le moral visé et d'où il
  vient (base, Dormoir, repas, Cantine, famine, lits, état du train).

## 0.21.1 — Ergonomie mobile, textes

- **Panneaux plus compacts sur téléphone** : titre, sous-onglets et pied de panneau prennent moins de hauteur, le
  contenu en gagne. Sur les petits écrans, les sous-onglets inactifs se réduisent à leur icône (avec leur
  pastille) et le panneau latéral est un peu plus large : plus aucun nom coupé.
- **Gares** : la spécialité et la réputation ne s'affichent plus que sur le premier onglet ; le rappel « Halte »
  répété est retiré.
- **Wagons expliqués** : chaque wagon a une vraie description (son rôle, qui y travaille), dans sa fiche et dans
  l'atelier du train ; les cartes de construction disent à quoi sert le wagon et quelle compétence il demande.
- **Textes** : « Charbon » partout (fini « Combustible »), portées d'armes plus claires (« à distance, 1 wagon
  autour »), tutoiement partout (les camps vouvoyaient), « Contrats » raccourci, pupitre du dépôt allégé.
- **Dépôt** : réparer le convoi ou fabriquer des munitions affiche ce qu'on vient d'obtenir.

## 0.21.0 — Last Loop, musiques

- **Nouveau nom : Last Loop** (écran titre, onglet du navigateur, textes). Les sauvegardes existantes sont gardées.
- **Musiques** (Gemini) : écran titre, route des Plaines, combat, halte (gares, camps, dépôt). Fondu enchaîné quand
  l'ambiance change, et boucle sans coupure (raccord en fondu à la fin du morceau). Volume dans les Options,
  y compris sur iPhone. Le boss reprend la musique de combat en attendant la sienne.

## 0.20.2 — Tourelles orientables, drone, Gus

- **Tourelles orientables** : la tête de la Tourelle (et de la Tourelle auto du toit) se tourne vers sa cible :
  profil à droite ou à gauche, trois quarts, ou de face quand l'ennemi est sur son propre wagon. Les traits de tir
  partent du bout des canons.
- **Drone faucheur** en image : il plane juste au-dessus du toit qu'il attaque.
- **Gus** en portrait, avec trois expressions (il parle, il rit, il s'inquiète) dans le tutoriel et ses conseils.
  Les conseils s'affichent en haut à gauche, plus petits, pour ne plus cacher le train.
- **Icône du jeu** (onglet du navigateur et écran d'accueil), prête pour la version installable.

## 0.20.1 — Lieux et train en images

- **Camps** en images (village, nomades, avant-poste, repaire de pillards), en version normale et **fortifiée**
  (à partir de 3 de défense), avec un **drapeau animé** coloré selon l'attitude du camp.
- **Poteaux d'aiguillage** en images : feu vert devant (la voie choisie), feu rouge derrière.
- **Atelier de la Traverse** en image.
- **Extensions de toit** en images (Grenier, Couchettes, Tourelle auto) : le haut du wagon est coupé et l'extension
  posée à la place, seulement quand il y en a une. Les dormeurs des Couchettes se couchent sur les nouveaux matelas.
- **Fonderie** en image (sans extension de toit : la cheminée prend la place) et **fourgon blindé à la porte
  enfoncée**.

## 0.20.0 — Tutoriel, son, tension

- **Tutoriel guidé par Gus**, qui sert d'introduction : il éclaire l'élément à toucher et bloque le reste
  (équipage, réserves et bilan, aiguillage, départ, premier arrêt, onglets). On peut le passer. Ensuite, Gus
  donne un conseil la première fois que certaines situations arrivent (vague, survivant à terre, Halte, camp,
  panne, rancune, dépôt, recherche, traque). Désactivable dans les Options.
- **Son** : bruitages fabriqués par le code (tirs, impacts, sifflet, freins, construction, trocs, alertes…)
  et roulement du train qui suit sa vitesse. Le lecteur de musique est prêt pour les pistes de Gemini.
- **Options** dans le menu : volume de la musique et des effets, vibrations, conseils de Gus.
  « Nouvelle partie » est remplacé par « Écran titre » (on recommence depuis l'écran titre).
- **Jamais de game over** : sous 3 survivants, personne ne meurt plus (à terre, ils tiennent jusqu'au dépôt) ;
  le dépôt remet toujours le convoi à 30 % d'intégrité au moins.
- **Tension** : indicateur de **traque** dans la barre du haut (crâne et niveau, détail au toucher). La traque
  rend aussi les ennemis plus coriaces. Une **ressource qui va manquer** dans moins d'une minute clignote en
  rouge, avec une alerte. L'intégrité se répare moins vite toute seule.
- **Tourelle auto** : ce n'est plus un wagon mais une **extension de toit** (comme le Grenier et les Couchettes),
  3 au plus. Les wagons Tourelle auto existants sont démontés et remboursés entièrement.
- **Traverse** : l'équipement de zone est grisé, « Prochainement ».
- Textes périmés corrigés (jalons, Savoir « bientôt », Traverse vers la Forêt de Rouille).

## 0.19.0 — Objectifs, bilan des ressources

- **Objectifs** (Carnet › Objectifs) : 10 objectifs pour les Plaines de Cendre, qui montrent le chemin de la zone
  (Plateau de récolte, équipage, exploration, allié, locomotive T2, recherches, le Roi, le Refroidissement).
  Récompenses modestes à récupérer, dont 2 clés. Pastille sur l'onglet Carnet quand une récompense attend.
  Les listes des zones 2 et 3 sont posées.
- **Carnet** en sous-onglets : Objectifs, Contrats en cours, Journal.
- **Bilan des ressources** : toucher la barre des ressources ouvre la production et la consommation actuelles
  par minute, détaillées par source (Chaudières, Serres, Atelier, repas…), ce qu'on a récolté ce tour, et
  l'entretien du prochain dépôt. À l'arrêt, il indique ce que la traction brûlera en route.
- **Rail** : l'onglet Train s'allume quand on peut toucher au train (dépôt, gares, camps).
- **Dépôt** : le bouton de départ dit « Partir » (et non plus « Repartir »).
- **Vitesse automatique** : le passage à ×1 ne dure que le temps du choix, à l'approche d'un arrêt. Une fois le
  train arrêté (récolte en cours), il reprend la vitesse d'avant.

## 0.18.0 — Recherche

- **Onglet Recherche** ouvert : trois branches (Moteur, Survie, Armement) en sous-onglets, trois paliers liés aux
  zones. Il faut un Laboratoire ; chaque recherche s'achète tout de suite avec du Savoir.
  - Palier 1 (Plaines) : Chaudière optimisée, Calorifugeage, Hydroponie, Cartographie, Médecine de fortune,
    Munitions perforantes, Soutes renforcées.
  - Palier 2 (Désert) : Moteur diesel (locomotive T3), Cantine, Formation, Métallurgie (Fonderie),
    Blindage composite.
  - Palier 3 (Toundra) : Hybride électrique (locomotive T4), Automatisation (Tourelle automatique), Optiques.
- Tous les effets agissent vraiment : énergie, combustible, Vivres, soins, dégâts et armure ennemie, capacités,
  moral, expérience, intégrité, portée des tourelles. La **Cartographie** montre le type des arrêts des voies
  inconnues, sur la carte et au pupitre.
- La Fonderie et la Tourelle automatique apparaissent dans les constructions, avec la recherche qu'elles demandent.
- **Climat des zones** branché (consommation, Serre, repousse) : neutre dans les Plaines, il comptera au désert et
  dans la toundra.
- **Carte** : la boucle part maintenant vers la droite depuis le dépôt, dans le même sens que le train.

## 0.17.0 — Trois zones, la traque, l'entretien

- **Trois zones** : Plaines de Cendre, puis Désert de Verre, puis Toundra fantôme (les deux dernières n'ont pas
  encore de voies). La zone la plus avancée fixe des plafonds :
  - niveau 2 maximum pour les wagons et le Fourgon blindé dans les Plaines (le niveau 3 viendra au désert) ;
  - locomotives T1 et T2 dans les Plaines, T3 au désert, T4 dans la toundra (la T5 sort du jeu).
- **Butin du boss** : la première victoire sur le Roi des Rails donne le **Blindage du Roi**.
- **Atelier de la Traverse** (nouvel arrêt sur la Traverse de Verre, 3 clés) : on y fabrique le **Refroidissement**
  (Blindage du Roi + 120 Ferraille + 40 Pièces), l'équipement de zone qui ouvrira le désert. La voie elle-même
  ouvrira avec le contenu du désert.
- **La traque** : tant que le boss de la zone vit, la menace monte de 12 % par tour après 3 tours (jusqu'à +96 %) :
  vagues plus grosses, errants plus fréquents, camps de pillards plus forts. Annoncée dans le résumé du tour.
- **Entretien du convoi** au dépôt : 3 Ferraille par wagon niveau 1, 6 Ferraille et 1 Pièce au niveau 2.
  Impayé, il abîme le convoi et le moral.
- **Rareté** (réglée par simulation d'un joueur actif) : on mange plus (0,04 Vivres/s par survivant), la Serre et
  les champs produisent moins, la locomotive brûle un peu plus ; en échange, décharges et mines repoussent plus vite
  et rapportent un peu plus de Ferraille. Objectif : des réserves entre 30 et 60 %, des manques à gérer.

## 0.16.0 — Démanteler

- **Démanteler un wagon** (en Halte, sauf la Chaudière ; la locomotive et le Fourgon blindé ne sont pas des wagons) :
  on récupère la moitié de ce qu'il a coûté (wagon, niveaux et module de toit). Son équipage retourne au repos.
  Refusé si l'équipage a besoin de ses lits, ou pendant un combat.
- **Retirer un Grenier ou des Couchettes** : le toit redevient libre, on peut y mettre l'autre module.
- Deux touchers pour confirmer (le bouton passe en « Toucher encore pour confirmer » pendant 3 s).
- Le stockage perdu fait déborder ce qui dépasse la nouvelle capacité (au plus la place retirée).
- La Chaudière n'apparaît plus dans la liste des constructions.

## 0.15.3 — Chaudière fixe, toits réservés

- La **Chaudière** est unique et reste toujours juste derrière la locomotive : on ne peut ni la déplacer, ni mettre
  un autre wagon à sa place, ni en construire une deuxième. Les anciennes sauvegardes la remettent à sa place.
- **Toits** : pas de Grenier ni de Couchettes sur la Chaudière, les Tourelles (manuelle et automatique) et le
  Plateau de récolte. Ceux déjà posés restent.

## 0.15.2 — Debug : ajouter des survivants

- Panneau de debug : choix du rôle (Mécanique, Terrain, Combat, Savoir) et du sexe, puis « +1 survivant ».
  Respecte les couchages libres. Le panneau défile s'il dépasse l'écran.

## 0.15.1 — Retouches de la mécano

- Endormie, elle est maintenant bien couchée sur le matelas (elle flottait au-dessus).
- Respiration identique pour tout le monde, à tous les postes ; au repos, le soupir ne revient qu'une fois sur quatre.
- L'eau du tuyau d'arrosage coule (trois images de filets qui avancent).
- Au poste de tir (tourelle, fourgon de queue) sans arme à distance : plus de fusil dans les mains.
- Cabine de la locomotive : les deux places de repos montrent des survivants assoupis assis, et non plus blessés.

## 0.15.0 — Premiers survivants dessinés

- **La mécano** (planches du manager) remplace les pantins pour les survivantes dont la compétence principale
  est la Mécanique : repos, pelle, marteau, arrosage, récolte, lecture, visée, tir, barre à mine, blessée,
  endormie. Elle s'anime en alternant les images de chaque geste.
- **Couleurs propres à chaque survivant** : le vêtement et les cheveux sont recolorés avec ses couleurs, une fois
  pour toutes. Deux mécanos ne se ressemblent donc pas.
- **Portraits** : la fiche, la barre d'équipage et les recrues montrent la tête du personnage dessiné.
- Les autres rôles gardent leur pantin en attendant leurs planches.

## 0.14.0 — Icônes dessinées, menus en onglets

- **Icônes** : 41 icônes viennent des planches du manager (ressources, compétences, onglets, sites de la carte,
  cadenas, cœur, étoile…). Elles remplacent les pictogrammes du code partout dans l'interface.
- **Menus en onglets** : plus besoin de défiler loin pour trouver une action.
  - Équipage : Survivants, Arsenal, Fabrication.
  - Fiche d'un survivant : Équipement, Compétences ; « Libérer du poste » reste en bas.
  - Gare : Trocs, Services, Contrat, Recrue.
  - Camp : Commerce, Relations, Recrue ; l'échelle d'attitude reste visible au-dessus.
  - Pastilles sur les onglets : nombre de recrues ou d'objets, « ! » quand un contrat attend ou qu'on peut fabriquer.
- Le rail d'onglets n'écrase plus l'accent de « Équipage ».
- Notes : plan des zones suivantes (atelier brise-glace vers la toundra, refroidissement vers le désert).

## 0.13.0 — Carte en boucle, atelier du train, illustrations

- **Carte** : l'anneau est maintenant une vraie voie ferrée en boucle. Le dépôt est en bas ; à chaque aiguillage,
  les embranchements se séparent puis se rejoignent. La voie par défaut reste sur la boucle. Arrêts le long des
  voies (attitude des camps, tour limite des contrats), voies inconnues en pointillés, cadenas des voies fermées,
  position du train en direct. Toucher une voie affiche ses arrêts à droite, et permet de la prendre (ou de
  l'ouvrir avec des clés) au prochain aiguillage.
- **Atelier du train** : le convoi en vignettes, dans l'ordre de la scène (queue à gauche, locomotive à droite).
  On touche une voiture pour voir son détail et ses actions (améliorer, toit, déplacer, « Qui y travaille »).
  La vignette « + » ouvre la construction.
- **Navigation** :
  - le rail d'onglets reste utilisable quand un panneau est ouvert (on passe de l'un à l'autre d'un toucher ;
    toucher l'onglet ouvert le referme) ;
  - bouton Retour : d'une fiche de survivant vers la liste d'équipage, d'une fiche de wagon vers l'atelier ;
  - liste d'équipage : une jauge de santé par survivant.
- **Aiguillage** : les noms des voies ne sont plus rognés (deux lignes, alignées en haut ; le levier disparaît
  sur les écrans bas).
- **Illustrations des 10 événements** (planches du manager), chargées en arrière-plan.
- **Images** : les contours roses laissés par le fond magenta sont nettoyés (champs, forêts, mines, décharges,
  gare, dépôt, ruines, forteresse et sa fumée, éolienne, plusieurs wagons).
- Les icônes pourront être remplacées par des images (planches Gemini) sans toucher au reste du code.

## 0.12.0 — Contrats, événements et nouvelle interface

- **Nouvelle interface : « le pupitre du mécanicien »**
  - Panneaux en tôle rivetée, boutons en émail qui s'enfoncent sous le doigt, titres en sérif sans majuscules criardes.
  - Les listes (trocs, services, équipage, journal) sont tenues comme un registre de gare : une ligne par entrée,
    séparées par un filet, au lieu d'une carte par ligne.
  - Panneaux latéraux : les actions principales (Repartir, Atelier du train) restent en bas, toujours visibles.
  - Le rail d'onglets marque le panneau ouvert ; les libellés ne débordent plus.
  - Bandeau d'équipage : tout l'équipage y figure. D'abord ceux qu'on peut placer, puis (après un filet) ceux qui
    travaillent, avec une pastille de la couleur de leur wagon (rouge en renfort, bleu nuit au repos).
  - Notifications plus petites, centrées sur la scène.
- **Contrats des gares** (GDD §8.4) : chaque gare propose de livrer une ressource avant 2 ou 3 tours. On accepte,
  puis on livre en repassant, en une ou plusieurs fois. Récompense : des Pièces, une étoile de réputation, parfois
  une clé. Raté : la gare perd confiance. Les contrats apparaissent dans le Carnet et sur la carte (tour limite).
- **Carnet de bord** (onglet Carnet, ouvert) : contrats en cours et journal du voyage (événements, contrats,
  pillages, alliances, morts, nouvelles du monde).
- **10 événements aléatoires** (GDD §7) : survivant isolé, convoi abandonné, marchand ambulant, tempête, mécano
  blessé, rail endommagé, entrepôt intact, fièvre à bord, carte froissée, surchauffe. Environ un par tour
  (22 % par tronçon, jamais au premier tronçon du premier tour, jamais à l'arrêt ni en plein combat, jamais deux
  fois le même de suite). Le jeu est en pause tant que la carte est ouverte.
- Debug : bouton « Événement ».

## 0.11.0 — Contacts avec les camps

- **Fourgon blindé** : image du manager intégrée (porte blindée, éperon, vigie, intérieur en coupe). Quand la porte
  cède, elle est arrachée et l'ouverture rougeoie.
- **Les camps répondent enfin** (GDD §3.4) : à l'approche (16 s avant), le pupitre propose selon l'attitude :
  - Allié, Pacifique, Prudent, Méfiant : **Faire halte** (le temps est suspendu, le panneau du camp s'ouvre),
    **Piller** ou **Passer** ;
  - Hostile : **Payer un tribut** (30 Vivres ou 25 Ferraille : pas d'attaque), **Piller** ou **Passer**.
- **Panneau du camp** : échelle des attitudes, trocs (Allié ou Pacifique ; Allié : +15 %), **Aider** (25 Vivres ou
  20 Ferraille : +1 niveau), **Négocier** (Prudent ou Méfiant, 10 Pièces : +1 niveau), recrue offerte par un allié.
  Devenir allié demande deux aides, lors de deux passages ; le premier passage en allié offre une clé de voie.
- **Piller** : le train s'arrête, le camp se défend par l'arrière (force × 1,2). Victoire : butin selon la richesse
  des terres liées, défense −2. Un camp non hostile pillé baisse d'un niveau et garde rancune ; ses voisins aussi
  baissent. On peut fuir (et sous 30 % d'intégrité, le train fuit seul).
- **Le monde se souvient** (tick au dépôt) : la rancune fortifie le camp et le ferme d'un niveau par tour jusqu'à
  Hostile ; une région affamée (terres à 25 % ou moins) se ferme ou s'affaiblit ; une région prospère renforce un
  camp hostile un tour sur deux. Deux aides de suite effacent la rancune. Les nouvelles s'affichent dans le résumé.
- Correction : les tirs de semonce venaient des camps Prudents au lieu des Méfiants.

## 0.10.0 — Fourgon de queue blindé

- **Fourgon de queue blindé** (idée du manager) : une extension boulonnée derrière le dernier wagon. Il suit le
  dernier wagon même si on réorganise le convoi et ne compte pas dans la traction. Construction en Halte
  (60 Ferraille + 8 Pièces), niveaux 2 et 3 (le 3 exige la locomotive T2).
- **La porte du train** : les assauts (camps hostiles, forteresse, boss) montent sur le fourgon et cognent la porte.
  Tant qu'elle tient (blindage 150 / 260 / 400), l'intégrité du train ne bouge pas. Une fois enfoncée, ils entrent
  et avancent vers la locomotive. Les errants, eux, montent toujours n'importe où ; les drones passent par-dessus.
- **Postes de garde** (1, puis 2) : on y glisse ses meilleurs combattants. La garde automatique y envoie aussi quelqu'un
  quand la porte est attaquée.
- **Réparation** : le fourgon se répare seul hors combat (plus vite avec des mécaniciens), au dépôt, ou en Halte contre
  de la Ferraille. Une porte enfoncée retient de nouveau les assauts à partir de 25 % de blindage.
- Dessin provisoire par le code (porte blindée, éperon, vigie, intérieur en coupe, porte arrachée quand elle cède) et
  jauge de blindage au-dessus. Toucher le fourgon ouvre l'atelier du train.
- Corrections : les ennemis qui décrochaient restaient figés au dépôt après un déraillement ; les messages disent
  maintenant « court défendre le Dormoir » (avec l'article).

## 0.9.0 — Combats à la Fallout Shelter

- **Errants sur la route** (comme les radcafards) : ils montent tous sur un wagon au hasard. S'ils ne sont pas
  éliminés assez vite, l'un d'eux passe au wagon voisin (toutes les 12 s environ), et ainsi de suite.
- **Assauts** (camps hostiles, forteresse, boss) : ils montent par l'arrière, sur le dernier wagon (la « porte »).
  Dès que plus personne ne leur tient tête dans un wagon, ils avancent d'un wagon vers la locomotive (3 s).
- **On se bat jusqu'au bout** : tout survivant présent dans un wagon attaqué se bat, même blessé. Seul un survivant
  à terre (0 PV) arrête ; sans soins, il meurt au bout de 30 s. Un blessé ne quitte plus son poste en plein combat.
- **Trousses de soins** (les Stimpaks) : +40 PV, ou relèvent un survivant à terre (25 PV), utilisables partout,
  même en plein combat (bouton dans la fiche). 2 au départ ; fabrication : 8 Vivres + 2 Pièces (arsenal).
- **Garde automatique** : s'il n'y a personne au repos, le travailleur en forme le plus proche quitte son poste
  (la Chaudière en dernier) et y retourne quand c'est calme.
- Ennemis : ils se déplacent visiblement d'un wagon à l'autre. Messages « se répandent » et « avancent ».
- Debug : bouton « Assaut » (vague de camp par l'arrière).

## 0.8.1 — Glisser sur tout le wagon

- Placer un survivant : il suffit de le lâcher n'importe où sur un wagon ; il prend le premier poste libre
  (le wagon s'allume en vert). On peut toujours viser un poste précis pour échanger deux survivants.
- Wagon sans poste libre : réparation s'il est en panne, renfort s'il est attaqué, repos si c'est un Dormoir.
- Combat : sous 40 PV, un survivant ne se bat plus (il reste couché ou à son poste) et la garde ne l'appelle pas.
  Au-dessus, les dormeurs d'un wagon attaqué se lèvent pour le défendre (vérifié).

## 0.8.0 — Armes, armures et défense par l'équipage

- Les survivants défendent le train : tout survivant valide présent dans un wagon attaqué se bat, au travail
  comme au repos (il se lève de sa couchette). Les blessés restent à l'écart.
- Garde automatique : un wagon attaqué sans défenseur reçoit le meilleur combattant au repos ; il retourne se
  coucher quand c'est calme. On peut aussi glisser un survivant sur un wagon attaqué (cadre rouge) pour l'envoyer en renfort.
- Armes : couteau, barre à mine, machette, masse de brute (corps à corps, dans son wagon) ; pistolet, arbalète,
  fusil de chasse, fusil à pompe (à distance, couvrent les wagons voisins ; les armes à feu consomment des Munitions).
- Armures : veste de cuir, plastron de ferraille, tenue anti-émeute, armure de brute. Les défenseurs encaissent
  une partie des coups à la place de l'intégrité, moins avec une armure.
- La compétence Combat augmente les dégâts et progresse en se battant.
- Fiche survivant : section Équipement (arme, armure, puissance au combat, bouton Changer).
- Onglet Équipage : arsenal du train (qui porte quoi) et fabrication en Halte (Ferraille, Pièces, Vivres).
- Butin : les ennemis lâchent parfois une arme ou une armure (le Roi des Rails : fusil à pompe et tenue anti-émeute).
- Gares : un objet à vendre par passage. Recrues : souvent avec leurs affaires (affiché avant de recruter).
- Nouvelle partie : Chaudière, Serre-Cuisine et Dormoir seulement ; Tourelle et Plateau de récolte se construisent.
  Barre à mine et couteau pour les 2 survivants, une veste de cuir en réserve.
- Les parties en cours : chaque survivant reçoit une barre à mine, et une veste de cuir rejoint l'arsenal.
- Dessin : armures portées sur la tenue, armes en main et postures de combat (frappe, tir), tirs des survivants armés.
- Correction : un survivant en réparation comptait comme travailleur du wagon.

## 0.7.0 — Remplir son train

- Nouvelle partie : 2 survivants seulement (un chauffeur, une jardinière). On remplit le train petit à petit.
- Dépôt : un volontaire se présente à chaque tour (bouton « Volontaire » du pupitre). Les gares en proposent aussi.
  Le premier recrutement est gratuit tant que l'équipage compte moins de 3 survivants.
- Chaque recrue demande un couchage libre : Dormoirs, cabine de la locomotive, et nouveau module de toit
  « Couchettes » (+2 lits, posé en Halte). Un wagon porte soit un Grenier, soit des Couchettes : stockage ou équipage.
- Les survivants au repos dorment dans les Couchettes, sous l'auvent ; on peut y glisser un survivant pour le coucher.
- Le bandeau d'équipage affiche les lits occupés (« 3 / 6 lits »), l'atelier du train aussi.
- Premier tour sans errants, le temps de s'installer. Passager clandestin si l'équipage tombe sous 2.

## 0.6.1 — Images du Bélier, de la Soute et du Laboratoire

- Locomotive T2 « Le Bélier » en image Gemini : 3 roues motrices reliées par la bielle d'accouplement.
- Soute et Laboratoire en images Gemini (les chercheurs se placent devant l'établi).
- Vocabulaire : « intégrité du convoi » partout (le mot « caisse » prêtait à confusion).

## 0.6.0 — Jalon J6 (1re partie) : gares et atelier du train

- Ennemis et boss en images Gemini : pillard motard, coureur de rouille, brute blindée, milicien, Le Roi des Rails.
  Animés par le code (course, coups, recul du camion).
- Gares : « Faire halte » (par défaut) ou « Passer ». En gare, le temps est suspendu et le panneau de la gare s'ouvre :
  3 trocs (4 au Marché), une recrue, réparation du convoi, une clé de voie par tour (60 Pièces), une rumeur
  (15 Pièces : révèle la voie inconnue de ton choix). Réputation (étoiles) : chaque troc ou recrue la fait monter
  et améliore les taux. Comptoir de Cendrebourg (Marché) et Gare de Fer-Blanc (Forge : réparations et améliorations
  moins chères).
- Onglet Train : construire des wagons (7 au maximum avec La Braise), les améliorer (niveaux 2 et 3), poser un
  Grenier sur le toit (+30 / +12 de stockage, à tout moment), changer l'ordre du convoi, passer à la locomotive T2
  « Le Bélier » (plus rapide, plus solide, un wagon de plus). Tout se fait en Halte, sauf le Grenier.
- Salve de barrage (locomotive T2) : les tourelles tirent deux fois plus vite pendant 6 s ; utilisable à l'arrêt.
- Atelier : recette Pièces ou Munitions, au choix dans la fiche du wagon.
- L'intégrité du convoi remonte toute seule en roulant (lentement), plus vite avec des mécaniciens à l'Atelier.
- Greniers (bâches et caisses) et niveaux (chevrons dorés) dessinés sur les wagons.
- Tourelle : les survivants se placent dans la casemate et non plus contre le mur blindé ; tirs depuis les canons.
- Pupitre : levier plus discret, les noms des voies ne sont plus coupés.
- Panneaux : ils ne se redessinent plus sous le doigt (un bouton pouvait ignorer un toucher).

## 0.5.0 — Jalon J5 : combat

- Ennemis : pillards motards, coureurs de rouille, brutes blindées (et, dessinés d'avance, drones, miliciens, loups,
  rampants, spectres). Ils arrivent par l'arrière ou l'avant, s'accrochent à un wagon et le frappent.
  Dessins provisoires faits par le code, en attendant les images Gemini.
- Vagues composées selon un budget de menace : errants (10 % par transit), camps hostiles au passage
  (Camp des Chacals, Barrage du Corridor, Avant-poste du Roi), coups de semonce des camps méfiants.
- Tourelles : tirs automatiques (traits lumineux), portée de 3 wagons, Munitions consommées ; sans munitions,
  « tir de fortune » à 20 %. Toucher un ennemi le marque comme cible prioritaire (réticule rouge).
- Intégrité du convoi (barre dans le haut de l'écran) : les ennemis accrochés l'entament, les survivants en poste
  dans le wagon attaqué prennent des coups, le wagon clignote en rouge et produit moitié moins.
- Déraillement à 0 : −40 % des ressources (sauf les clés), tout le monde à 20 de santé, retour au dépôt.
  La partie continue.
- Pleine vapeur (bouton rond à droite) : vitesse ×1,5 pendant 8 s, les ennemis au sol décrochent au bout de 5 s
  (sans butin) ; 8 Combustible, recharge 45 s.
- Forteresse de la Tranchée : assaut contre Le Roi des Rails (700 PV, appelle ses motards à 66 % et 33 %,
  renforts de la forteresse). Victoire : 3 clés, Ferraille, Munitions, Savoir, et la forteresse tombe.
  Bouton « Fuir » ; fuite automatique sous 30 % d'intégrité.
- Dépôt : le convoi est rafistolé (+30 % d'intégrité) ; ateliers pour réparer (+25 intégrité) et refaire des munitions
  contre de la Ferraille.
- Butin à chaque ennemi abattu ; message « Vague repoussée » ; résumé du tour avec vagues, ennemis et déraillement.
- Pupitre : à l'approche d'un camp hostile, il annonce l'attaque et la force du camp.
- Bouton « Auto » : un poste par wagon d'abord (la Tourelle est pourvue).
- Debug : Vague, Boss, Intégrité −50, Intégrité pleine.
- Corrections : marge de 8 px autour du jeu en dehors de l'artefact ; panneaux du bas qui débordaient de l'écran.

## 0.4.1 — Retours du manager

- Sites en images Gemini (champ, forêt, mine, casse, ruines, gare, dépôt, forteresse). Les champs, forêts, mines
  et casses passent en fondu vers leur version épuisée quand leur stock baisse.
- Vitesse automatique : en ×2, le jeu repasse en ×1 quand un site de récolte approche (8 s avant), le temps de choisir,
  puis revient en ×2 au départ. Si tu touches au bouton pendant ce temps, ton choix l'emporte. Un petit « A » sur
  le bouton signale la vitesse automatique.
- Réparations revues : glisse n'importe quel survivant valide sur un wagon en panne (y compris le Dormoir, qui n'a pas
  de poste) pour qu'il le répare. Tout survivant présent dans le wagon participe ; environ 30 s, plus vite avec
  de la Mécanique et à plusieurs. Jauge verte autour de la clé, progression en % dans la fiche du wagon.
  Le réparateur retourne au repos une fois le travail fini. Réparer fait progresser en Mécanique.
  Une réparation commencée se termine pendant la Halte.
- Compétences expliquées : dans la fiche d'un survivant, chaque compétence indique à quoi elle sert et l'efficacité
  qu'elle donne (+12 % par point, moral compris) ; la fiche d'un wagon indique la compétence utile, et l'équipage
  affiche son efficacité au poste.
- Correction : en dehors de l'artefact, l'écran « Tourne ton téléphone » pouvait rester affiché par-dessus le jeu.

## 0.4.0 — Jalon J4 : aiguillages et circuit 1

- Le circuit des Plaines de Cendre complet : 6 tronçons, 14 embranchements, 21 sites (grille du GDD §3.10).
- Un tour dure environ 10 minutes : transits, arrêts, aiguillages, retour au dépôt.
- Pupitre d'aiguillage : cartes des embranchements (connus, inconnus avec feu de signal, verrouillés avec cadenas)
  et levier à glisser ; compte à rebours avant l'aiguillage, le pupitre pulse dans les 12 dernières secondes.
- Arrêts de récolte : 8 s avant l'arrivée, le pupitre propose Récolte durable, Exploitation intensive, Replanter
  ou Passer, avec les gains prévus. Gains en 5 ramassages (textes flottants), bouton Repartir.
- Stocks des sites : chaque récolte les entame, ils repoussent à chaque tour (champs vite, mines lentement).
- Carte (onglet) : l'anneau déroulé comme un plan de métro, brouillard sur les voies inconnues, état vu au dernier passage.
- Dépôt (Halte) : le temps est suspendu ; soins, réserve de secours, repousse du monde, résumé du tour.
- Pannes : 4 % par wagon à chaque embranchement ; un mécanicien répare en 20 s, ou 3 Pièces tout de suite.
- Verrous : une voie verrouillée s'ouvre avec des clés de voie (deux touchers pour confirmer).
- Sites dessinés provisoirement par le code en attendant les images Gemini.
- Debug : +3 clés, révéler la carte.

## 0.3.0 — Jalon J3 : équipage et économie

- 4 survivants au départ, un par compétence (Mécanique, Terrain, Combat, Savoir), dessinés par le code :
  apparence unique (peau, coiffure, tenue, accessoire), animation selon le poste (pelleter, arroser, trier, viser…).
- Glisser-déposer : appui long sur un survivant (dans le bandeau ou dans le train), puis glisser vers un poste.
  Lâcher sur un poste occupé échange les deux survivants ; sur le Dormoir ou le bandeau, le met au repos.
  La caméra défile toute seule près des bords.
- Bouton « Auto » : place le meilleur survivant libre à chaque poste (Chaudière, Serre, Tourelle, Plateau, Atelier).
- Énergie : la Chaudière alimente le train ; sans chauffeur, le train ralentit (indicateur d'énergie et de vitesse
  en haut à droite de la scène). Le charbon se consomme selon l'énergie utilisée.
- Production : la Serre-Cuisine produit des Vivres ; l'équipage mange.
- Besoins : santé, moral, blessures (au repos jusqu'à guérison), état critique de 30 s puis mort définitive ;
  un survivant critique se sauve en le glissant sur le Dormoir. Mémorial des disparus.
- Garde-fou : un passager clandestin monte à bord si l'équipage tombe sous 3.
- Progression : chaque poste fait gagner de l'expérience dans sa compétence.
- Fiches : toucher un survivant (fiche avec santé, moral, compétences) ou un wagon (effet chiffré, équipage).
- Onglet « Équipage » : liste de tous les survivants.
- Les parties des versions précédentes reçoivent automatiquement leur équipage.

## 0.2.5 — Décor plus vide et plus varié

- 6 nouveaux éléments de décor : éolienne de ferme, épave de voiture, maison abandonnée, tracteur, rochers,
  château d'eau (10 au total).
- Décor clairsemé, à l'image d'un monde vidé : environ la moitié des emplacements restent vides.
- Plus de répétition : les éléments sont tirés dans un « paquet » mélangé, et un même élément ne revient pas
  avant plusieurs emplacements.
- Profondeur variable : chaque élément est posé à une distance différente, du plus loin au plus proche.

## 0.2.4 — Ciel vivant

- Le ciel n'est plus une image figée : dégradé aux couleurs de l'image Gemini, soleil fixe, et nuages
  qui dérivent lentement au vent, répartis sur toute la hauteur du ciel (y compris en vue dézoomée).
- Nuages dessinés par le code dans le style des images (traînée effilée, bosses arrondies, ombre, contour).
- La bande d'horizon (plaine, fermes, pylônes lointains) se fond dans le ciel.
- Correction : une bande striée apparaissait au-dessus de la voie (trace de l'image précédente).

## 0.2.3 — Netteté et paysage en profondeur

- Plus aucune image pixelisée : chaque image est préparée en plusieurs tailles et dessinée à partir de la plus proche
  de sa taille à l'écran (train, roues, attelages, décor), à tous les zooms.
- Pièces du train ré-exportées en meilleure résolution.
- Paysage en profondeur : ciel, collines, éléments dispersés (pylônes, granges, arbres morts, clôtures) et sol,
  chacun à sa distance. Taille et vitesse de défilement cohérentes avec le train.
- Le zoom s'applique à tout le paysage, pas seulement au train ; l'horizon descend quand on dézoome.
- Éléments de décor placés au hasard mais toujours au même endroit : plus de répétition visible.
- Le ciel est une seule image à la largeur de l'écran : son soleil n'est plus répété.

## 0.2.2 — Train mécanique

- Locomotive redessinée sans roues : roues motrices et petites roues Gemini qui tournent ; manetons,
  bielle d'accouplement (toujours horizontale), bielle motrice, crosse sur sa glissière et tige de piston
  animées par le code avec le vrai mouvement.
- Bogies identiques sous tous les wagons : châssis Gemini + roues Gemini qui tournent.
- Attelages : chaîne et tendeur Gemini entre chaque voiture.
- Tourelle refaite dans le style des autres wagons.
- Décors : couches plus petites et moins étirées ; liserés violets supprimés sur les câbles et contours.

## 0.2.1 — Retours du manager

- Décors Gemini des Plaines de Cendre (ciel, collines, sol) ; soleil dessiné à part pour ne pas se répéter.
- Wagons abaissés : leurs tampons sont alignés sur l'arrière de la locomotive.
- Attelages provisoires plus propres (barre de traction et maillon), en attendant l'image Gemini.

## 0.2.0 — Jalon J2 : le train vivant

- Premières images Gemini intégrées : illustration de l'écran titre, locomotive « La Braise », 6 wagons
  (Chaudière, Serre-Cuisine, Dormoir, Plateau de récolte, Tourelle, Atelier).
- Le convoi complet en coupe : locomotive en tête, 5 wagons attelés, bogies et roues animés par le code,
  roues de la locomotive qui tournent, léger balancement des voitures.
- Caméra le long du convoi : glisser du doigt avec inertie et butées.
- Deux vues : proche (gestion) et convoi (tout le train), par double toucher ou bouton loupe.
- Mini-carte du convoi en bas de la scène : une couleur par wagon, cadre = partie visible ; la toucher centre la vue.
- Le paysage suit la caméra, avec la même parallaxe que pendant le trajet.

## 0.1.0 — Jalon J1 : fondations

- Structure du projet (modules `core`, `sim`, `render`, `ui`, `data`), aucun outil externe.
- Écran de chargement avec astuces de Gus, écran titre animé, écran de jeu en paysage.
- Boucle de jeu à pas fixe (0,1 s) avec rendu interpolé et vitesse ×1 / ×2.
- Décor des Plaines de Cendre en parallaxe sur 3 couches, rails et traverses, locomotive provisoire
  animée avec sa fumée.
- Barre du haut : ressources de départ, position sur le réseau, temps de jeu, menu.
- Sauvegarde automatique (toutes les 10 s, en quittant, en arrière-plan) avec copie de secours ;
  export et import par copier-coller ; nouvelle partie avec double confirmation.
- Écran « Tourne ton téléphone », pause automatique en arrière-plan, écran d'erreur avec export.
- Mode debug : images par seconde, vitesse ×1/×5/×20, +1 000 ressources, effacer la sauvegarde.
