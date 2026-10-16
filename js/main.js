// Démarrage du jeu : écrans, boucle, sauvegarde, orientation, erreurs.
import { zoneOf } from './data/zones.js';
import { openResearch } from './ui/researchPanel.js';
import { openBalance } from './ui/balancePanel.js';
import { checkObjectives, claimable } from './sim/objectives.js';
import { CONFIG } from './data/config.js';
import { t } from './core/i18n.js';
import { createLoop } from './core/loop.js';
import { createState } from './core/state.js';
import { loadGame, saveGame, hasSave, wipeSave, storageAvailable } from './core/save.js';
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
import { addFloater } from './render/floaters.js';
import { loadGroup } from './render/assets.js';
import { createScene, refreshSceneArt } from './render/scene.js';
import { initHud, updateHud, setHudSpeed } from './ui/hud.js';
import { initToasts, toast, buzz } from './ui/toasts.js';
import { initModal, isModalOpen, closeModal, el } from './ui/modal.js';
import { openMenu, openExport, openCredits } from './ui/menu.js';
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
import { initPanels, refreshPanel, closePanel, openTab } from './ui/panels.js';
import { openSurvivorSheet, openWagonSheet, openCrewList } from './ui/sheets.js';
import { initCrewBar, rebuild as rebuildCrewBar, updateCrewBar } from './ui/crewbar.js';
import { initDrag, beginDrag, tickDrag } from './ui/dragdrop.js';

// Version installable (GitHub Pages) : jeu hors ligne grâce au service worker. Jamais dans l'aperçu.
if ('serviceWorker' in navigator && /(^|\.)github\.io$|^localhost$/.test(location.hostname)) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

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
window.addEventListener('error', e => crash(e.error || e.message));
window.addEventListener('unhandledrejection', e => crash(e.reason));

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

function tryFullscreen() {
  const root = document.documentElement;
  try {
    const p = root.requestFullscreen ? root.requestFullscreen({ navigationUI: 'hide' }) : null;
    if (p && p.then) {
      p.then(() => {
        try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* non supporté */ }
      }).catch(() => {});
    }
  } catch (e) { /* plein écran refusé : sans conséquence */ }
}

// Premier toucher : son débloqué (les navigateurs l'exigent) et, sur téléphone, plein écran tenté
let firstTouchDone = false;
function onFirstTouch() {
  if (firstTouchDone) return;
  firstTouchDone = true;
  initAudio();
  unlockMusic();
  if (matchMedia('(pointer: coarse)').matches) tryFullscreen();
}

// ---------- Sauvegarde ----------
function persist(showToast) {
  if (!app.state || !app.canSave) return;
  const ok = saveGame(app.state);
  if (showToast && ok) toast(t('save.saved'));
}

document.addEventListener('visibilitychange', () => {
  app.hidden = document.visibilityState === 'hidden';
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

function buildTitleButtons() {
  const box = $('title-actions');
  box.innerHTML = '';
  if (hasSave()) {
    box.append(
      el('button', { class: 'btn btn-primary btn-big', text: t('title.continue'), onclick: () => startGame(false) }),
      el('button', { class: 'btn btn-ghost', text: t('title.newGame'), onclick: confirmTitleNewGame })
    );
  } else {
    box.append(el('button', { class: 'btn btn-primary btn-big', text: t('title.play'), onclick: () => startGame(true) }));
  }
  box.append(el('button', { class: 'btn btn-ghost', text: t('menu.credits'), onclick: () => openCredits() }));
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

function startGame(fresh) {
  adopt((!fresh && loadGame()) || newState());
  show('game');
  if (location.hash === '#debug') { openDebugPanel(); window.__app = app; }
  launchTutorial();
}

// Tutoriel guidé : il démarre avec une nouvelle partie (une partie reprise en cours de tutoriel le reprend)
function launchTutorial() {
  if (!app.state || !app.state.tuto || app.state.tuto.done) return;
  startTutorial({
    getState: () => app.state,
    setPause: on => { app.tutoPause = on; refreshPause(); },
    choiceOpen: () => !app.eventOpen && !!document.querySelector('.switchboard .sb-actions .sb-action'),
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
    onDebug: () => { closeModal(); openDebugPanel(); },
    tryFullscreen
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
async function start(data) {
  initToasts($('toasts'));
  initModal($('modal-layer'));
  app.canSave = storageAvailable();

  // Textes fixes de la page
  $('title-sub').textContent = t('game.subtitle');
  $('title-version').textContent = t('title.version', { v: CONFIG.VERSION });
  $('rotate-title').textContent = t('rotate.title');
  $('rotate-body').textContent = t('rotate.body');
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
    toast(t('route.depotArrive'));
    buzz([20, 40, 20]);
    persist(false);
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
  bus.on('combat:derail', d => { toast(t('combat.derail') + (d && d.eased ? ' ' + t('combat.derailHunt') : ''), 'warn'); buzz([80, 40, 80, 40, 120]); });
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

  await loadGroup('boot', p => { $('loading-bar').style.transform = `scaleX(${p})`; });
  loadGroup('later');     // illustrations d'événements, etc. : en arrière-plan
  refreshSceneArt();
  if (!app.canSave) toast(t('save.unavailable'), 'warn');

  registerHot();
  if (data && data.resume && hasSave()) startGame(false);
  else {
    buildTitleButtons();
    show('title');
  }
}

const hot = window.claude && window.claude.hot;
if (hot && hot.ready) hot.ready(start);
else start(hot && hot.data ? hot.data : {});
