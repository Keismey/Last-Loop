# Last Loop

Jeu de survie et de gestion ferroviaire pour navigateur mobile, en paysage. Un jeu Keismey Studio.

**Jouer : https://keismey.github.io/Last-Loop/** (installable : « Ajouter à l'écran d'accueil »).

- Conception et code : Claude (Anthropic) · Direction : Keismey Studio
- Images et musiques : générées avec Gemini (Google) · Sons : synthétisés par le code

Le document de conception (GDD) fait foi pour toutes les règles et valeurs.

## Structure

- `index.html` — la page du jeu
- `css/` — styles
- `js/core/` — boucle, état, sauvegarde, textes
- `js/sim/` — règles du jeu (aucun affichage)
- `js/render/` — dessin de la scène
- `js/ui/` — interface
- `js/data/` — toutes les valeurs d'équilibrage et tous les textes
- `assets/` — images (WebP) et musiques (MP3), facultatives : le jeu fonctionne sans

## En ligne

- `tools/make_gh.py <clone du dépôt>` écrit la version GitHub Pages (page complète, Cloudflare Web Analytics,
  `sw.js` et `version.json` régénérés). Changer `VERSION` dans `js/data/config.js` à chaque mise en ligne.
- `sw.js` : jeu jouable hors ligne. `version.json` : le jeu se met à jour seul à la publication suivante.
- Sauvegarde dans le navigateur (`localStorage`, clé `loopexpress.save`) ; son résumé est lu par le hub.
- Polices système : aucune requête vers un service externe (hors la mesure d'audience Cloudflare, sans cookie).

Mode debug : ajouter `#debug` à l'adresse, ou toucher 7 fois le numéro de version dans le menu.
