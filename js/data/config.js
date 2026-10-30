// Réglages techniques du projet (pas d'équilibrage ici : voir balance.js)
export const CONFIG = {
  // 'artifact' pendant le développement (artefact Claude), 'pages' une fois sur GitHub Pages
  TARGET: 'artifact',
  VERSION: '0.26.7',
  SAVE_KEY: 'loopexpress.save',
  SETTINGS_KEY: 'loopexpress.settings',
  HUB_URL: 'https://keismey.github.io/',
  SIM_STEP: 0.1,            // pas de simulation, en secondes de jeu
  MAX_STEPS_PER_FRAME: 10,  // pas de rattrapage au-delà
  AUTOSAVE_SEC: 10,         // sauvegarde automatique, en secondes réelles
  DPR_MAX: 2,               // densité de pixels plafonnée
  DEBUG_TAPS: 7,            // touchers sur le numéro de version pour ouvrir le debug
  DEBUG_ALLOWED: false       // mis à false dans la version GitHub (tools/make_gh.py) : ni #debug ni touchers
};
