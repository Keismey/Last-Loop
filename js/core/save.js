// Sauvegarde locale, copie de secours, migrations, export et import (GDD §17.4).
import { CONFIG } from '../data/config.js';
import { STATE_VERSION, summary } from './state.js';
import { seedCrew } from '../sim/crew.js';
import { newCombat, maxIntegrity } from '../sim/combat.js';
import { addItem } from '../sim/equipment.js';
import { BUILD } from '../data/build.js';

const KEY = CONFIG.SAVE_KEY;
const BAK = CONFIG.SAVE_KEY + '.bak';

function get(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function set(key, value) {
  try { localStorage.setItem(key, value); return true; } catch (e) { return false; }
}
function remove(key) {
  try { localStorage.removeItem(key); } catch (e) { /* stockage indisponible */ }
}

// Migrations : MIGRATIONS[n] transforme une sauvegarde de version n en version n + 1.
const MIGRATIONS = {
  // v1 → v2 (jalon J3) : arrivée de l'équipage
  1: data => {
    if (!data.crew || !data.crew.length) seedCrew(data);
    data.memorial = data.memorial || [];
    return data;
  },
  // v2 → v3 (jalon J4) : vrai trajet ; la partie reprend au dépôt
  2: data => {
    data.route = { ring: 1, lap: (data.route && data.route.lap) || 1, distance: (data.route && data.route.distance) || 0 };
    data.world = {};
    for (const w of data.train.wagons) w.broken = false;
    return data;
  },
  // v3 → v4 (jalon J5) : combat et intégrité du convoi
  3: data => {
    // La Tourelle passe au milieu du convoi pour couvrir tous les wagons
    const ws = data.train.wagons;
    const ti = ws.findIndex(w => w.type === 'turret');
    if (ti > 2 && ws.length >= 3) ws.splice(2, 0, ws.splice(ti, 1)[0]);
    data.combat = newCombat();
    data.train.integrity = maxIntegrity(data);
    return data;
  },
  // v4 → v5 : équipement ; chaque survivant reçoit une barre à mine
  4: data => {
    data.inventory = [];
    data.nextItemId = 1;
    for (const s of data.crew) { s.weapon = addItem(data, 'pipe').id; s.armor = null; }
    addItem(data, 'leather');
    return data;
  }
};

// v5 → v6 : la Chaudière passe juste derrière la locomotive (elle ne bouge plus)
MIGRATIONS[5] = data => {
  const ws = data.train.wagons;
  const i = ws.findIndex(w => w.type === 'boiler');
  if (i > 0) ws.unshift(ws.splice(i, 1)[0]);
  return data;
};

// v6 → v7 : progression entre les zones ; si le Roi des Rails est déjà tombé, son matériau est rendu
MIGRATIONS[6] = data => {
  data.progress = { zone: 1, kit: null, materials: {}, bossDown: {}, zoneSince: { 1: 1 } };
  const t = data.world && data.world.sites && data.world.sites.c1_tranchee;
  if (t && t.fallen) { data.progress.bossDown[1] = t.fallenLap || 1; data.progress.materials.kingplate = 1; }
  // La traque part du tour actuel : une vieille partie n'est pas punie d'un coup
  data.progress.zoneSince[1] = (data.route && data.route.lap) || 1;
  return data;
};

// v7 → v8 : la Tourelle auto devient une extension de toit ; les anciens wagons sont démontés et remboursés
MIGRATIONS[7] = data => {
  data.tuto = { step: 0, done: true };     // une partie déjà commencée n'a pas besoin du tutoriel
  data.tipsSeen = data.tipsSeen || {};
  const ws = data.train.wagons;
  const old = ws.filter(w => w.type === 'autoturret');
  for (const w of old) {
    const k = 1 + (w.level >= 2 ? BUILD.levelMult[2] : 0) + (w.level >= 3 ? BUILD.levelMult[3] : 0);
    for (const [r, v] of Object.entries(BUILD.oldAutoturret)) data.resources[r] = (data.resources[r] || 0) + Math.round(v * k);
    for (const s of data.crew) if (s.post && s.post.wagon === w.id) s.post = null;
    ws.splice(ws.indexOf(w), 1);
  }
  return data;
};

function migrate(data) {
  let v = data.version || 1;
  while (v < STATE_VERSION) {
    const fn = MIGRATIONS[v];
    if (fn) data = fn(data);
    v += 1;
    data.version = v;
  }
  return data;
}

function isValid(data) {
  return data && typeof data === 'object' && typeof data.version === 'number'
    && data.resources && data.train && data.route;
}

function serialize(state) {
  // Le résumé passe en tête du fichier : c'est ce que lit le hub
  const { summary: _old, ...rest } = state;
  return JSON.stringify({ summary: summary(state), ...rest });
}

function parse(text) {
  if (!text) return null;
  try {
    const data = JSON.parse(text);
    return isValid(data) ? data : null;
  } catch (e) {
    return null;
  }
}

export function hasSave() {
  return !!parse(get(KEY)) || !!parse(get(BAK));
}

// Partie enregistrée par une version plus récente du jeu (autre appareil synchronisé, ancienne copie hors ligne) :
// on ne peut ni la lire ni l'écraser, il faut mettre le jeu à jour
export function saveTooNew() {
  const data = parse(get(KEY)) || parse(get(BAK));
  return !!data && data.version > STATE_VERSION;
}

export function loadGame() {
  const data = parse(get(KEY)) || parse(get(BAK));
  if (!data) return null;
  if (data.version > STATE_VERSION) return null;
  delete data.summary;
  return migrate(data);
}

export function saveGame(state) {
  if (saveTooNew()) return false;     // jamais par-dessus une partie plus récente (effacée seulement par « Nouvelle partie »)
  const previous = get(KEY);
  if (previous) set(BAK, previous);
  return set(KEY, serialize(state));
}

export function wipeSave() {
  remove(KEY);
  remove(BAK);
}

export function storageAvailable() {
  const probe = KEY + '.probe';
  if (!set(probe, '1')) return false;
  remove(probe);
  return true;
}

// Export : texte en base64 (UTF-8), facile à copier et à coller
export function exportText(state) {
  const bytes = new TextEncoder().encode(serialize(state));
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return 'LOOPX1:' + btoa(bin);
}

// Import : renvoie { ok, state } ou { ok: false, reason }
export function importText(text) {
  text = (text || '').trim();
  if (!text) return { ok: false, reason: 'empty' };
  try {
    const body = text.startsWith('LOOPX1:') ? text.slice(7) : text;
    const bin = atob(body.replace(/\s+/g, ''));
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    const data = JSON.parse(new TextDecoder().decode(bytes));
    if (!isValid(data)) return { ok: false, reason: 'bad' };
    if (data.version > STATE_VERSION) return { ok: false, reason: 'tooNew' };
    delete data.summary;
    return { ok: true, state: migrate(data) };
  } catch (e) {
    return { ok: false, reason: 'bad' };
  }
}
