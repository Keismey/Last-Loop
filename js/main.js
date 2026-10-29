// Démarrage du jeu : écrans, boucle, sauvegarde, orientation, erreurs.
import { zoneOf } from './data/zones.js';
import { openResearch } from './ui/researchPanel.js';
import { openBalance } from './ui/balancePanel.js';
import { checkObjectives, claimable } from './sim/objectives.js';
import { CONFIG } from './data/config.js';
import { t, switchLang, IS_EN } from './core/i18n.js';
import { createLoop } from './core/loop.js';
import { createState } from './core/state.js';
import { loadGame, saveGame, hasSave, saveTooNew, wipeSave, storageAvailable } from './core/save.js';
import { scrollDemo, ensureRoute, decisionContext, hasChoice } from './sim/route.js';
import { ensureCombat, setTarget } from './sim/combat.js';
import { initAbilities, updateAbilities } from './ui/abilities.js';
import { openStation, openDepotRecruit } from './ui/stationPanel.js';
import { openTrain } from './ui/trainPanel.js';
import { openCamp } from './ui/campPanel.js';
import { openLog } from './ui/logPanel.js';
import { openEvent } from './ui/eventCard.js';
import { addLog } from './sim/log.js';
import { stationSite } from './sim/station.js';
import { isHalte } from './sim/route.js';
import { initSwitchboard, updateSwitchboard, refreshSwitchboard } from './ui/switchboard.js';
import { openMap } from './ui/mapPanel.js';
import { openSummary } from './ui/summary.js';
import { openDerail } from './ui/derailCard.js';
import { addFloater } from './render/floaters.js';
import { loadGroup } from './render/assets.js';
import { createScene, refreshSceneArt } from './render/scene.js';
import { initHud, updateHud, setHudSpeed } from './ui/hud.js';
import { initToasts, toast, buzz } from './ui/toasts.js';
import { initModal, isModalOpen, isModalLocked, openModal, closeModal, el } from './ui/modal.js';
import { openMenu, openExport, openCredits, openNotes } from './ui/menu.js';
import { PATCH_NOTES } from './data/patchnotes.js';
import { openDebug, updateDebug, closeDebug } from './ui/debug.js';
import { icon } from './ui/icons.js';
import { initSceneInput } from './ui/sceneInput.js';
import { toggleZoom, camera } from './render/camera.js';
import { simulate } from './sim/simulate.js';
import { seedCrew, displayName } from './sim/crew.js';
import { giveStartKit, ensureInventory } from './sim/equipment.js';
import { computePower } from './sim/energy.js';
import { bus } from './core/bus.js';
import { initAudio, sfx, trainAmbience, suspendAudio } from './audio/sound.js';
import { playMusic, unlockMusic, muteMusic } from './audio/music.js';
import { wireSounds } from './audio/wire.js';
import { startTutorial, gusTip, tutoActive } from './ui/tutorial.js';
import { huntLevel } from './sim/zones.js';
import { initPanels, refreshPanel, closePanel, openTab, panelOpen } from './ui/panels.js';
import { openSurvivorSheet, openWagonSheet, openCrewList } from './ui/sheets.js';
import { initCrewBar, rebuild as rebuildCrewBar, updateCrewBar } from './ui/crewbar.js';
import { initDrag, beginDrag, tickDrag } from './ui/dragdrop.js';

// Version en ligne (GitHub Pages) : jeu hors ligne grâce au service worker, mise à jour automatique. Jamais dans l'aperçu.
const ON_PAGES = 'serviceWorker' in navigator && /(^|\.)github\.io$|^localhost$/.test(location.hostname);
// enregistré une fois les images du jeu chargées : la copie hors ligne reprend alors celles du navigateur au lieu de tout retélécharger
const registerSW = () => { if (ON_PAGES) navigator.serviceWorker.register('sw.js').catch(() => {}); };
// Installable par le menu du navigateur, sans invite : l'appli à installer en priorité, c'est le hub Keismey Studio
addEventListener('beforeinstallprompt', e => e.preventDefault());

const $ = id => document.getElementById(id);

const app = {
  screen: 'loading',   // loading | title | game
  state: null,         // partie en cours
  demo: createState(), // train de l'écran titre
  hidden: false,
  portrait: false,
  crashed: false,
  menuOpen: false,
  canSave: true
};

let titleScene, gameScene, loop;
let speedBtn = null;
let hudAcc = 0, saveAcc = 0;

// ---------- Erreurs : écran « Le train a déraillé » (GDD §17.10) ----------
function crash(err) {
  if (app.crashed) return;
  app.crashed = true;
  try { if (app.state && app.canSave) saveGame(app.state); } catch (e) { /* rien de plus à faire */ }
  const box = $('screen-error');
  $('error-detail').textContent = String((err && (err.message || err.reason)) || err || '');
  box.hidden = false;
  if (loop) loop.setPaused(true);
}
// Seules les erreurs du jeu arrêtent la partie. Les autres (script d'un autre site comme la mesure d'audience,
// extension du navigateur, avertissement « ResizeObserver loop » sans objet d'erreur) vont seulement en console.
// Page sans adresse web propre (aperçu dans un artefact, origine « null ») : on ne peut pas trier, tout compte.
const ORIGIN = /^https?:/.test(location.origin) ? location.origin : null;
const fromGame = err => {
  if (!err) return false;
  if (!ORIGIN) return true;
  // la pile, sans le message (qui peut citer l'adresse du site sans venir du jeu)
  return typeof err.stack === 'string' && err.stack.replace(String(err.message || ''), '').includes(ORIGIN);
};
window.addEventListener('error', e => {
  if (e.error && (!ORIGIN || (e.filename || '').startsWith(ORIGIN) || fromGame(e.error))) crash(e.error);
  else console.warn('Erreur ignorée (hors du jeu) :', e.message);
});
window.addEventListener('unhandledrejection', e => {
  if (fromGame(e.reason)) crash(e.reason);
  else console.warn('Promesse rejetée ignorée (hors du jeu) :', e.reason);
});

// ---------- Pause globale ----------
function refreshPause() {
  if (!loop) return;
  const blocked = app.hidden || app.portrait || app.crashed;
  if (app.screen === 'game') loop.setPaused(blocked || app.menuOpen || app.eventOpen || app.tutoPause);
  else if (app.screen === 'title') loop.setPaused(blocked);
  else loop.setPaused(true);
  $('screen-rotate').hidden = !app.portrait;
}

// ---------- Orientation : seul un téléphone tenu droit est bloqué ----------
const portraitQuery = matchMedia('(orientation: portrait) and (pointer: coarse)');
function checkOrientation() {
  app.portrait = portraitQuery.matches;
  refreshPause();
}
portraitQuery.addEventListener('change', checkOrientation);

// Plein écran + verrou paysage. Ouvert depuis le hub installé, le jeu tourne dans la
// fenêtre du hub : seul ce verrou force l'horizontale, quel que soit le manifeste du hub.
// À appeler sur « pointerup » : sur écran tactile, « pointerdown » ne compte pas comme
// un geste de l'utilisateur et le navigateur refuse alors le plein écran.
// Dans l'appli installée (hub ou jeu), le verrou suffit : pas de plein écran, car Android consomme
// alors le bouton retour pour quitter le plein écran, ce qui libère aussi le verrou (écran « Tourne
// ton téléphone »). Le plein écran ne sert qu'en cas d'échec du verrou, ou dans un onglet du navigateur.
let landscapeLocked = false, landscapeTries = 0;
const INSTALLED = () => matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches;
function lockLandscape() {
  try {
    const p = screen.orientation && screen.orientation.lock ? screen.orientation.lock('landscape') : null;
    if (p && p.then) return p.then(() => { landscapeLocked = true; return true; }).catch(() => false);
  } catch (e) { /* non supporté (iPhone) */ }
  return Promise.resolve(false);
}
function goFullscreen() {
  const root = document.documentElement;
  if (document.fullscreenElement || !root.requestFullscreen) return;
  try { root.requestFullscreen({ navigationUI: 'hide' }).then(lockLandscape).catch(() => {}); } catch (e) { /* refusé */ }
}
function tryLandscape(force) {
  if (landscapeLocked || !matchMedia('(pointer: coarse)').matches) return;
  if (!force && landscapeTries >= 3) return;   // pas d'insistance si l'appareil refuse
  landscapeTries++;
  if (document.fullscreenElement) { lockLandscape(); return; }
  if (INSTALLED()) { lockLandscape().then(ok => { if (!ok) goFullscreen(); }); return; }
  goFullscreen();
}

// Premier toucher : son débloqué (les navigateurs l'exigent)
let firstTouchDone = false;
function onFirstTouch() {
  if (firstTouchDone) return;
  firstTouchDone = true;
  initAudio();
  unlockMusic();
}

// ---------- Sauvegarde ----------
let tooNewTold = false;
function persist(showToast) {
  if (!app.state || !app.canSave) return;
  const ok = saveGame(app.state);
  if (showToast && ok) toast(t('save.saved'));
  // une version plus récente a enregistré la partie pendant qu'on jouait (synchro) : on le dit, une fois
  if (ok) tooNewTold = false;
  else if (!tooNewTold && saveTooNew()) { tooNewTold = true; toast(t('save.tooNew'), 'warn'); }
}

document.addEventListener('visibilitychange', () => {
  app.hidden = document.visibilityState === 'hidden';
  if (!app.hidden) checkUpdate();
  if (app.hidden) persist(false);
  suspendAudio(app.hidden);
  muteMusic(app.hidden);
  refreshPause();
});
window.addEventListener('pagehide', () => persist(false));

// ---------- Écrans ----------
function show(screen) {
  app.screen = screen;
  $('screen-loading').hidden = screen !== 'loading';
  $('screen-title').hidden = screen !== 'title';
  $('screen-game').hidden = screen !== 'game';
  refreshPause();
}

let derailEased = 0;     // crans de traque perdus au dernier déraillement (montrés sur sa carte)

function buildTitleButtons() {
  const box = $('title-actions');
  box.innerHTML = '';
  if (saveTooNew()) {
    // Partie d'une version plus récente : « Continuer » lancerait une nouvelle partie par-dessus
    box.append(
      el('p', { class: 'title-confirm', text: t('title.tooNew') }),
      el('button', { class: 'btn btn-primary btn-big', text: t('title.update'), onclick: () => updateNow() }),
      el('button', { class: 'btn btn-ghost', text: t('title.newGame'), onclick: confirmTitleNewGame })
    );
  } else if (hasSave()) {
    box.append(
      el('button', { class: 'btn btn-primary btn-big', text: t('title.continue'), onclick: () => startGame(false) }),
      el('button', { class: 'btn btn-ghost', text: t('title.newGame'), onclick: confirmTitleNewGame })
    );
  } else {
    box.append(el('button', { class: 'btn btn-primary btn-big', text: t('title.play'), onclick: () => startGame(true) }));
  }
  box.append(el('button', { class: 'btn btn-ghost', text: t('menu.options'), onclick: openTitleOptions }));
}

// Options depuis l'écran titre : même menu, sans ce qui touche à la partie en cours
function openTitleOptions() {
  if (isModalOpen()) return;
  openMenu({
    atTitle: true,
    onResume: () => {},
    onLang: switchLang,
    onDebug: () => {},
    tryFullscreen: () => goFullscreen()
  });
}

function confirmTitleNewGame() {
  const box = $('title-actions');
  box.innerHTML = '';
  const yes = el('button', { class: 'btn btn-danger', text: t('confirm.yes') });
  let step = 0;
  const msg = el('p', { class: 'title-confirm', text: t('confirm.newGame.body') });
  yes.addEventListener('click', () => {
    step += 1;
    if (step === 1) {
      msg.textContent = t('confirm.newGame.second');
      yes.textContent = t('confirm.yesSure');
      return;
    }
    wipeSave();
    startGame(true);
  });
  box.append(msg, yes, el('button', { class: 'btn btn-ghost', text: t('confirm.cancel'), onclick: buildTitleButtons }));
}

function newState() {
  const s = seedCrew(createState());
  giveStartKit(s);
  ensureRoute(s);
  return s;
}

// Après un chargement, un import ou une nouvelle partie
function adopt(state) {
  ensureRoute(state);
  ensureCombat(state);
  ensureInventory(state);
  app.state = state;
  resetAutoSpeed();
  computePower(state);
  closePanel();
  rebuildCrewBar();
  refreshSwitchboard();
  persist(false);
  // Partie reprise sur une carte d'événement restée ouverte
  if (state.events && state.events.active) setTimeout(() => showEvent(state.events.active), 0);
}

// ---------- Événements (GDD §7) : carte en pause ----------
function showEvent(ev) {
  if (!app.state || app.screen !== 'game') return;
  closePanel();
  app.eventOpen = true;
  refreshPause();
  buzz([20, 30, 20]);
  openEvent(() => app.state, ev, { onDone: () => { app.eventOpen = false; refreshPause(); refreshSwitchboard(); persist(false); } });
}

// Images du jeu : chargées pendant l'écran titre ; « Jouer » attend la fin (écran de chargement) si besoin
let bootLoad = null, bootReady = false, bootP = 0, starting = false;
const loadingBar = p => { $('loading-bar').style.transform = `scaleX(${p})`; };

async function startGame(fresh) {
  if (!fresh && saveTooNew()) { buildTitleButtons(); show('title'); return; }
  if (!bootReady) {
    if (starting) return;
    starting = true; show('loading'); loadingBar(bootP);
    await bootLoad;
    starting = false;
  }
  adopt((!fresh && loadGame()) || newState());
  show('game');
  if (CONFIG.DEBUG_ALLOWED && location.hash === '#debug') { openDebugPanel(); window.__app = app; }
  launchTutorial();
}

// Tutoriel guidé : il démarre avec une nouvelle partie (une partie reprise en cours de tutoriel le reprend)
function launchTutorial() {
  if (!app.state || !app.state.tuto || app.state.tuto.done) return;
  startTutorial({
    getState: () => app.state,
    setPause: on => { app.tutoPause = on; refreshPause(); },
    choiceOpen: () => !app.eventOpen && !!document.querySelector('.switchboard .sb-actions .sb-action'),
    inGame: () => app.screen === 'game',
    modalOpen: () => isModalOpen(),
    onDone: () => { app.tutoPause = false; refreshPause(); persist(false); }
  });
}

function backToTitle() {
  app.tutoPause = false;
  closeDebug();
  buildTitleButtons();
  show('title');
}

function openDebugPanel() {
  openDebug($('scene-overlay'), {
    loop,
    getState: () => app.state,
    onWipe: () => {
      wipeSave();
      app.state = null;
      backToTitle();
    }
  });
}

// ---------- Bouton retour du téléphone (voir js/ks-back.js) ----------
// fenêtre ouverte → fermée (sauf les cartes où il faut choisir) ; panneau latéral → fermé ;
// en partie → menu de pause (un 2e retour reprend la partie) ; écran titre → hub (confirmé).
// En plein écran, Android consomme le premier retour pour quitter le plein écran, sans prévenir la page :
// on traite cette sortie comme un retour, et le toucher suivant redemande le plein écran.
function onBack() {
  if (isModalOpen()) { if (!isModalLocked()) closeModal(); return; }
  if (panelOpen()) { closePanel(); return; }
  if (app.screen === 'game') { openGameMenu(); return; }
  if (app.screen === 'title') confirmHub();
}
function confirmHub() {
  const L = (fr, en) => (IS_EN ? en : fr);
  const box = el('div', { class: 'menu-list' },
    el('p', { class: 'muted', text: L('Ta partie est enregistrée. Tu retrouveras les autres jeux de Keismey Studio sur le hub.', 'Your game is saved. You will find the other Keismey Studio games on the hub.') }),
    el('button', { class: 'btn btn-primary', text: L('Aller au hub', 'Go to the hub'), onclick: () => { closeModal(); window.KSBack?.toHub(); } }),
    el('button', { class: 'btn', text: L('Annuler', 'Cancel'), onclick: () => closeModal() })
  );
  openModal(box, { title: L('Quitter Last Loop ?', 'Leave Last Loop?') });
}
window.KSBack?.init({ back: onBack, lang: () => (IS_EN ? 'en' : 'fr'), title: () => app.screen === 'title' && !isModalOpen() && !panelOpen() });
let lastPop = 0;
window.addEventListener('popstate', () => { lastPop = performance.now(); });
document.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement) return;
  landscapeLocked = false; landscapeTries = 0;   // le toucher suivant remet l'horizontale
  if (INSTALLED()) lockLandscape();               // appli installée : le verrou revient sans plein écran
  setTimeout(() => { if (performance.now() - lastPop > 500 && !document.hidden) onBack(); }, 250);
});

function openGameMenu() {
  if (app.screen !== 'game' || isModalOpen()) return;
  app.menuOpen = true;
  refreshPause();
  openMenu({
    getState: () => app.state,
    onResume: () => { app.menuOpen = false; refreshPause(); },
    onImport: state => adopt(state),
    onTitle: () => {
      app.menuOpen = false;
      persist(false);
      closePanel();
      backToTitle();
    },
    onLang: () => { persist(false); switchLang(); },
    onHub: () => persist(false),
    onDebug: () => { if (!CONFIG.DEBUG_ALLOWED) return; closeModal(); openDebugPanel(); },
    tryFullscreen: () => goFullscreen()
  });
}

// ---------- Vitesse automatique à l'approche d'un site ----------
// En ×2, le jeu repasse en ×1 quand la fenêtre de décision d'un site de récolte s'ouvre, puis revient en ×2
// au départ. Si le joueur touche au bouton pendant ce temps, son choix l'emporte et rien n'est restauré.
const autoSpeed = { active: false, prev: 1, key: null };

function syncSpeedBtn() {
  if (!speedBtn || !loop) return;
  const v = loop.getSpeed();
  setHudSpeed(v);
  const label = '×' + v;
  if (speedBtn.textContent !== label) speedBtn.textContent = label;
  speedBtn.classList.toggle('on', v >= 2);
  speedBtn.classList.toggle('auto', autoSpeed.active);
}

function setSpeed(v) {
  loop.setSpeed(v);
  syncSpeedBtn();
}

function resetAutoSpeed() {
  autoSpeed.active = false;
  autoSpeed.key = null;
}

function updateAutoSpeed() {
  const st = app.state;
  let key = null;
  if (st && st.route.mode !== 'depot') {
    // Seulement pendant l'approche, tant que le choix est ouvert : une fois arrêté (récolte), on repart à la vitesse d'avant
    const d = decisionContext(st);
    if (d && d.site && !d.stopping && hasChoice(st, d.site)) key = d.site.id;
  }
  if (key) {
    if (key !== autoSpeed.key) {
      autoSpeed.key = key;
      if (!autoSpeed.active && loop.getSpeed() > 1) {
        autoSpeed.active = true;
        autoSpeed.prev = loop.getSpeed();
        setSpeed(1);
      }
    }
  } else if (autoSpeed.key) {
    if (autoSpeed.active) setSpeed(autoSpeed.prev);
    resetAutoSpeed();
    syncSpeedBtn();
  }
}

// ---------- Son : roulement du train et musique selon la situation ----------
function soundContext(running) {
  const st = app.state;
  if (app.screen !== 'game' || !st) { trainAmbience(0); playMusic('mus_title'); return; }
  const speed = running && st.power ? st.power.factor * loop.getSpeed() : 0;
  trainAmbience(app.menuOpen ? 0 : speed);
  const c = st.combat;
  const fight = c && c.enemies && c.enemies.some(e => e.phase !== 'dead' && e.phase !== 'leave');
  const boss = fight && c.enemies.some(e => e.boss && e.phase !== 'dead');
  playMusic(boss ? 'mus_boss' : fight ? 'mus_combat' : (st.route.mode !== 'run' || isHalte(st)) ? 'mus_station' : 'mus_c' + st.route.ring);
}

// ---------- Boucle ----------
function update(dt) {
  if (app.screen === 'game' && app.state) {
    simulate(app.state, dt);
    updateAutoSpeed();
  } else if (app.screen === 'title') {
    scrollDemo(app.demo, dt);
  }
}

function render(alpha, dtReal) {
  const paused = loop.isPaused();
  const running = !paused && (app.screen !== 'game' || (app.state && app.state.route.mode === 'run'));
  if (app.screen === 'game' && app.state) {
    const halte = isHalte(app.state);
    $('halte-banner').hidden = !halte;
    $('scene').classList.toggle('halte', halte);
  }
  if (app.screen === 'title') {
    titleScene.draw(app.demo, alpha, dtReal, running);
    hudAcc += dtReal;
    if (hudAcc >= 0.25) { hudAcc = 0; soundContext(false); }
  }
  else if (app.screen === 'game' && app.state) {
    tickDrag(dtReal);
    gameScene.draw(app.state, alpha, dtReal, running);
    hudAcc += dtReal;
    if (hudAcc >= 0.25) {
      hudAcc = 0;
      checkObjectives(app.state);
      updateHud(app.state);
      updateCrewBar();
      updateSwitchboard();
      updateAbilities();
      refreshPanel();
      updateDebug(loop.getFps());
      syncSpeedBtn();
      soundContext(running);
      if (huntLevel(app.state) >= 1) gusTip(app.state, 'hunt');
    }
    saveAcc += dtReal;
    if (saveAcc >= CONFIG.AUTOSAVE_SEC) {
      saveAcc = 0;
      persist(false);
    }
  }
}

// ---------- Rechargement à chaud de l'artefact (garde la partie ouverte) ----------
function registerHot() {
  const hot = window.claude && window.claude.hot;
  if (!hot || !hot.snapshot) return;
  try {
    hot.snapshot(() => {
      persist(false);
      return { resume: app.screen === 'game' };
    });
  } catch (e) { /* sans conséquence */ }
}

// ---------- Démarrage ----------
// ---------- Studio, nouveautés, mises à jour ----------
// Logo Keismey Studio au lancement : toucher pour passer, sinon 2,4 s après son chargement (5 s au plus)
function studioSplash() {
  const d = $('studio-splash');
  if (!d) return;
  if (navigator.webdriver && !/[?&]splash/.test(location.search)) { d.remove(); return; }
  d.hidden = false;
  let gone = false;
  const end = () => { if (gone) return; gone = true; d.classList.add('out'); setTimeout(() => d.remove(), 650); };
  d.addEventListener('pointerdown', end);
  const im = d.querySelector('img');
  const arm = () => setTimeout(end, 2400);
  if (im.complete) arm(); else { im.onload = arm; im.onerror = end; }
  setTimeout(end, 5000);
}

// Nouveautés montrées une fois après chaque mise à jour (pas à la toute première partie)
const NOTES_KEY = 'loopexpress.notes';
function maybeShowNotes() {
  let seen = null;
  try { seen = localStorage.getItem(NOTES_KEY); localStorage.setItem(NOTES_KEY, CONFIG.VERSION); } catch (e) { return; }
  if (seen === CONFIG.VERSION || !hasSave()) return;
  if (!PATCH_NOTES.some(n => n.v === CONFIG.VERSION)) return;
  setTimeout(() => { if (app.screen === 'title') openNotes(); }, 2900);
}

// Recharge sur la dernière version en ligne (service worker mis à jour d'abord) ; hors ligne, la page se recharge telle quelle
function updateNow() {
  persist(false);
  const sw = 'serviceWorker' in navigator ? navigator.serviceWorker.getRegistration().then(r => r && r.update()) : Promise.resolve();
  sw.catch(() => {}).then(() => setTimeout(() => location.reload(), 300));
}

// Nouvelle version en ligne : à l'écran titre on recharge tout de suite (une fois), en partie un bandeau propose de le faire
function checkUpdate() {
  if (!ON_PAGES) return;
  fetch('version.json?t=' + Date.now(), { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).then(j => {
    if (!j || !j.v || j.v === CONFIG.VERSION) return;
    let tried = null;
    try { tried = sessionStorage.getItem('loopexpress.upd'); } catch (e) { /* stockage indisponible */ }
    const go = () => {
      try { sessionStorage.setItem('loopexpress.upd', j.v); } catch (e) { /* stockage indisponible */ }
      updateNow();
    };
    if (tried !== j.v && app.screen !== 'game') { go(); return; }
    if (document.querySelector('.update-bar')) return;
    const b = el('button', { class: 'update-bar', type: 'button' }, el('b', { text: t('update.title') }), el('span', { text: t('update.body') }));
    b.addEventListener('click', go);
    document.body.appendChild(b);
  }).catch(() => {});
}

async function start(data) {
  initToasts($('toasts'));
  initModal($('modal-layer'));
  app.canSave = storageAvailable();

  // Textes fixes de la page
  $('title-sub').textContent = t('game.subtitle');
  $('title-version').textContent = t('title.version', { v: CONFIG.VERSION });
  $('rotate-title').textContent = t('rotate.title');
  $('rotate-body').textContent = t('rotate.body');
  $('rotate-go').textContent = t('rotate.go');
  $('rotate-icon').innerHTML = icon('phone');
  $('loading-title').textContent = t('loading.title');
  $('error-title').textContent = t('error.title');
  $('error-body').textContent = t('error.body');
  $('error-export').textContent = t('error.export');
  $('error-reload').textContent = t('error.reload');
  $('error-export').addEventListener('click', () => {
    if (app.state) openExport({ getState: () => app.state, onResume: () => {} });
  });
  $('error-reload').addEventListener('click', () => location.reload());

  const tips = t('loading.tips');
  $('loading-tip').textContent = tips[Math.floor(Math.random() * tips.length)];

  const getState = () => app.state;
  const openSurvivor = (id, back = null) => openSurvivorSheet(getState, id, back);
  initPanels($('panel-host'));
  initHud({
    resBox: $('hud-res'), routeEl: $('hud-route'), timeEl: $('hud-time'),
    tabsBox: $('tabs'), menuBtn: $('btn-menu'), onMenu: openGameMenu,
    powerEl: $('hud-power'), progressEl: $('leg-progress'), integrityEl: $('hud-integrity'), huntEl: $('hud-hunt'),
    onRes: () => openBalance(getState),
    badges: { log: st => claimable(st) },
    onTab: tab => {
      // Toucher l'onglet du panneau ouvert le referme
      if (openTab() === tab) { closePanel(); return; }
      if (tab === 'crew') openCrewList(getState, openSurvivor);
      if (tab === 'map') openMap(getState);
      if (tab === 'train') showTrain();
      if (tab === 'log') openLog(getState);
      if (tab === 'research') openResearch(getState);
    }
  });
  // Atelier du train ; « Qui y travaille » ouvre la fiche du wagon
  const showTrain = select => openTrain(getState, { select, onWagonSheet: id => openWagonSheet(getState, id, openSurvivor, () => showTrain(id)) });
  // Halte en gare ou au camp : le bon panneau
  const showStation = () => {
    const site = stationSite(getState());
    const opts = { onTrain: () => showTrain(), onLeave: () => refreshSwitchboard() };
    if (site && site.type === 'camp') openCamp(getState, opts); else openStation(getState, opts);
  };
  initSwitchboard($('switchboard'), { getState, onSummary: () => openSummary(getState), onStation: showStation, onRecruit: () => openDepotRecruit(getState) });
  bus.on('route:halt', () => { refreshSwitchboard(); showStation(); buzz([20, 40, 20]); });
  bus.on('train:built', w => persist(false));
  bus.on('train:loco', () => persist(false));
  bus.on('train:dismantled', () => persist(false));
  bus.on('train:roof', () => persist(false));
  bus.on('station:rep', n => toast(t('station.repUp', { n })));
  initAbilities($('abilities'), { getState });
  $('halte-banner').textContent = t('halte.banner');

  // Nouvelles du trajet
  const RES_COLORS = { fuel: '#f2b04e', food: '#a9d37a', scrap: '#c9c0c2', parts: '#e6dccb', know: '#7fd0c9', ammo: '#e8a33d' };
  bus.on('route:branch', ({ branch, discovered }) => toast(t(discovered ? 'route.discovered' : 'route.branch', { name: branch.name })));
  bus.on('route:pickup', ({ got }) => {
    for (const [r, v] of Object.entries(got)) if (v >= 0.5) addFloater(`+${Math.round(v)} ${t('res.' + r)}`, RES_COLORS[r] || '#EDE6D6');
  });
  bus.on('route:key', site => { toast(t('route.key', { site: site.name })); buzz([30, 30, 60]); });
  bus.on('route:cantAfford', () => toast(t('route.cantAfford'), 'warn'));
  bus.on('route:traverseSoon', () => toast(t('route.traverseSoon')));
  bus.on('route:depart', () => toast(t('route.depart')));
  bus.on('route:depot', summary => {
    // Les nouvelles du tour entrent au carnet (le tour vient de s'achever)
    const st = getState();
    for (const n of [...(summary.news || [])].reverse()) if (n.key !== 'news.regrown') { addLog(st, n.key, n); st.log[0].lap = summary.lap; }
    persist(false);
    // Déraillement : d'abord la carte qui raconte l'accident, puis le résumé du tour
    if (summary.derailed) { openDerail(summary, derailEased, () => openSummary(getState)); derailEased = 0; return; }
    toast(t('route.depotArrive'));
    buzz([20, 40, 20]);
    openSummary(getState);
  });
  bus.on('route:stop', () => refreshSwitchboard());
  bus.on('route:leave', () => refreshSwitchboard());
  bus.on('wagon:broken', w => { toast(t('wagon.broken', { wagon: t('wagon.' + w.type) }), 'warn'); buzz(30); });
  bus.on('wagon:repaired', w => toast(t('wagon.repaired', { wagon: t('wagon.' + w.type) })));
  // Combat (GDD §6)
  const lootText = got => Object.entries(got || {}).filter(([, v]) => v >= 0.5).map(([r, v]) => `+${Math.round(v)} ${t('res.' + r)}`).join(' · ');
  let lastHitBuzz = 0;
  bus.on('combat:wave', ({ kind, site }) => {
    toast(t(kind === 'warning' ? 'combat.warning' : kind === 'camp' ? 'combat.campAttack' : kind === 'raid' ? 'combat.raidStart' : 'combat.wave', { site: site || '' }), 'warn');
    buzz([30, 30, 30]);
  });
  bus.on('combat:cleared', ({ loot }) => toast(t('combat.cleared') + (lootText(loot) ? ' · ' + lootText(loot) : '')));
  bus.on('combat:kill', ({ e, got }) => {
    const txt = lootText(got);
    if (txt) addFloater(txt, RES_COLORS[Object.keys(got)[0]] || '#EDE6D6', e.wagon);
  });
  bus.on('combat:hit', () => {
    const now = performance.now();
    if (now - lastHitBuzz > 1200) { lastHitBuzz = now; buzz(30); }
  });
  bus.on('combat:bossArrives', () => { toast(t('combat.boss'), 'warn'); buzz([60, 40, 60]); });
  bus.on('combat:ram', ({ guards }) => {
    buzz([80, 30, 40]);
    if (!app.ramTold) { app.ramTold = true; if (!guards) toast(t('combat.ramFirst'), 'warn'); }
  });
  bus.on('combat:bossJump', () => { toast(t('combat.bossJump'), 'warn'); buzz([40, 60, 120]); });
  bus.on('combat:summon', () => toast(t('combat.summon'), 'warn'));
  bus.on('combat:reinforce', () => toast(t('combat.reinforce'), 'warn'));
  bus.on('combat:victory', ({ got }) => { toast(t('combat.victory', { loot: lootText(got) })); buzz([40, 40, 80]); persist(false); });
  bus.on('combat:fled', () => toast(t('combat.fled'), 'warn'));
  bus.on('zone:bossDown', ({ ring, loot }) => {
    if (!loot) return;
    const st = getState();
    setTimeout(() => toast(t('zone.bossLoot', { mat: t('mat.' + loot) })), 2500);
    addLog(st, 'log.bossDown', { boss: t('boss.' + zoneOf(ring).boss), mat: t('mat.' + loot) });
  });
  bus.on('zone:kit', () => persist(false));
  bus.on('research:done', () => persist(false));
  bus.on('objective:done', o => { toast(t('obj.doneToast', { name: t('obj.' + o.id, { n: o.n }) })); addLog(getState(), 'log.objective', { name: t('obj.' + o.id, { n: o.n }) }); buzz([20, 30, 20]); });
  bus.on('objective:claimed', () => persist(false));
  bus.on('combat:lowIntegrity', () => toast(t('combat.lowIntegrity'), 'warn'));
  bus.on('combat:derail', d => { derailEased = (d && d.eased) || 0; buzz([80, 40, 80, 40, 120]); });
  bus.on('combat:ability', () => refreshSwitchboard());
  let lastGuard = 0;
  bus.on('combat:guard', ({ s, w }) => {
    const now = performance.now();
    if (now - lastGuard > 4000) { lastGuard = now; toast(t('combat.guard', { name: displayName(s), wagon: t('wagonThe.' + w.type) })); }
  });
  let lastMove = 0;
  const moveToast = (key, wagon) => {
    const now = performance.now();
    if (now - lastMove > 5000) { lastMove = now; toast(t(key, { wagon: t('wagon.' + wagon.type) }), 'warn'); }
  };
  bus.on('combat:spread', ({ wagon }) => moveToast('combat.spread', wagon));
  bus.on('combat:advance', ({ wagon }) => moveToast('combat.advance', wagon));
  bus.on('event:open', ev => showEvent(ev));
  // Contrats (GDD §8.4) et carnet de bord
  bus.on('contract:accepted', ({ site, c }) => addLog(getState(), 'log.contractAccepted', { site: site.name, n: c.qty, res: t('res.' + c.res), lap: c.deadline }));
  bus.on('contract:done', ({ site, parts, key }) => {
    toast(t('contract.done', { site: site.name, p: parts, key: key ? t('contract.doneKey') : '' }));
    addLog(getState(), 'log.contractDone', { site: site.name, p: parts });
    persist(false);
  });
  bus.on('crew:died', s => addLog(getState(), 'log.died', { name: displayName(s) }));
  bus.on('camp:raided', ({ site }) => addLog(getState(), 'log.raided', { site: site.name }));
  bus.on('hunt:reset', ({ site }) => { toast(t('hunt.reset', { site: site.name })); addLog(getState(), 'log.huntReset', { site: site.name }); });
  bus.on('camp:allyKey', site => addLog(getState(), 'log.allyKey', { site: site.name }));
  // Camps (GDD §3.4)
  bus.on('camp:tribute', ({ site, cost }) => toast(t('camp.tributePaid', { name: site.name, c: lootText(cost).replace(/\+/g, '−') })));
  bus.on('camp:noTribute', site => toast(t('camp.tributeFail', { name: site.name }), 'warn'));
  bus.on('camp:angered', site => { toast(t('camp.angered', { name: site.name }), 'warn'); buzz([30, 30]); });
  bus.on('camp:raided', ({ site, got }) => { toast(t('camp.raided', { name: site.name, loot: lootText(got) })); buzz([40, 40, 80]); persist(false); });
  bus.on('camp:allyKey', site => { toast(t('camp.allyKey', { name: site.name })); buzz([30, 30, 60]); });
  bus.on('combat:breach', () => { toast(t('combat.breach'), 'warn'); buzz([40, 40, 80]); });
  bus.on('combat:doorFixed', () => toast(t('combat.doorFixed')));
  bus.on('item:new', ({ item, source }) => { if (source === 'loot') { toast(t('combat.item', { name: t('item.' + item.type) })); buzz([15, 30, 15]); } });

  initCrewBar($('crew-bar'), { getState, onOpenSurvivor: openSurvivor });
  initDrag({
    sceneEl: $('scene-canvas'), barEl: $('crew-bar'), ghostEl: $('drag-ghost'),
    getState, getScale: () => gameScene.getScale()
  });

  // Nouvelles de l'équipage
  bus.on('crew:levelup', ({ s, skill }) => toast(t('crew.levelup', { name: displayName(s), skill: t('skill.' + skill), lvl: s.skills[skill] })));
  bus.on('crew:injured', s => toast(t('crew.injuredToast', { name: displayName(s) }), 'warn'));
  bus.on('crew:critical', s => { toast(t('crew.criticalToast', { name: displayName(s) }), 'warn'); buzz([60, 40, 60]); });
  // Conseils de Gus (une fois chacun)
  const tip = key => () => gusTip(app.state, key);
  bus.on('combat:wave', tip('wave'));
  bus.on('crew:critical', tip('critical'));
  bus.on('route:halt', site => gusTip(app.state, site && site.type === 'camp' ? 'camp' : 'halt'));
  bus.on('wagon:broken', tip('broken'));
  bus.on('camp:angered', tip('grudge'));
  bus.on('route:depot', tip('depot'));
  bus.on('research:done', tip('research'));
  bus.on('combat:bossArrives', tip('boss'));
  bus.on('crew:died', s => toast(t('crew.died', { name: displayName(s) }), 'warn'));
  bus.on('crew:joined', s => toast(t('crew.joined', { name: displayName(s) })));

  speedBtn = $('btn-speed');
  speedBtn.setAttribute('aria-label', t('hud.speed'));
  speedBtn.addEventListener('click', () => {
    autoSpeed.active = false;   // choix du joueur : il l'emporte sur la vitesse automatique
    setSpeed(loop.getSpeed() === 1 ? 2 : 1);
    buzz(10);
  });

  document.addEventListener('pointerdown', onFirstTouch, { capture: true });
  document.addEventListener('pointerup', () => tryLandscape(false), { capture: true });
  $('rotate-go').addEventListener('click', () => tryLandscape(true));
  // Petit clic sur chaque bouton de l'interface
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('button:not([disabled])')) sfx('click'); }, { capture: true });
  wireSounds(bus, sfx);
  document.addEventListener('contextmenu', e => e.preventDefault());

  titleScene = createScene($('title-canvas'), { mode: 'title', railAt: 0.86, refHeight: 300 });
  gameScene = createScene($('scene-canvas'), { mode: 'game' });
  initSceneInput($('scene-canvas'), {
    getScale: () => gameScene.getScale(),
    onSurvivorTap: s => openSurvivor(s.id),
    onWagonTap: w => (w.id === 'caboose' ? showTrain('caboose') : openWagonSheet(getState, w.id, openSurvivor)),
    onSurvivorHold: (s, x, y) => beginDrag(s, x, y),
    onEnemyTap: id => { if (app.state) { setTarget(app.state, id); buzz(10); } }
  });

  const zoomBtn = $('btn-zoom');
  zoomBtn.setAttribute('aria-label', t('hud.zoom'));
  zoomBtn.innerHTML = icon('zoom');
  zoomBtn.addEventListener('click', () => {
    toggleZoom();
    zoomBtn.classList.toggle('on', camera.zoomIdx === 1);
    buzz(10);
  });

  loop = createLoop({ step: CONFIG.SIM_STEP, maxSteps: CONFIG.MAX_STEPS_PER_FRAME, update, render });
  loop.start();
  checkOrientation();
  show('loading');
  studioSplash();

  await loadGroup('title', loadingBar);     // l'illustration de l'écran titre, seule
  bootLoad = loadGroup('boot', p => { bootP = p; if (app.screen === 'loading') loadingBar(p); }).then(() => {
    bootReady = true;
    refreshSceneArt();
    loadGroup('later');     // illustrations d'événements, etc. : en arrière-plan
    registerSW();
  });
  if (!app.canSave) toast(t('save.unavailable'), 'warn');

  registerHot();
  if (data && data.resume && hasSave()) startGame(false);
  else {
    buildTitleButtons();
    show('title');
    maybeShowNotes();
  }
  checkUpdate();
}

const hot = window.claude && window.claude.hot;
if (hot && hot.ready) hot.ready(start);
else start(hot && hot.data ? hot.data : {});
