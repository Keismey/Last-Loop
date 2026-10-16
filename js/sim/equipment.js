// Équipement des survivants : inventaire du train, armes et armures, fabrication, butin.
// Un objet est { id, type } dans state.inventory ; un survivant porte s.weapon / s.armor = id d'objet.
import { WEAPONS, ARMORS, CRAFT, LOOT, START_KIT, MEDKIT, itemKind } from '../data/items.js';
import { rngNext } from '../core/rng.js';
import { bus } from '../core/bus.js';
import { fx } from './research.js';

export function ensureInventory(state) {
  if (!Array.isArray(state.inventory)) state.inventory = [];
  if (!state.nextItemId) state.nextItemId = state.inventory.length + 1;
  if (typeof state.medkits !== 'number') state.medkits = MEDKIT.start;
}

// ---------- Trousses de soins ----------
export function canCraftMedkit(state) {
  return Object.entries(MEDKIT.cost).every(([r, v]) => (state.resources[r] || 0) >= v);
}
export function craftMedkit(state) {
  if (!canCraftMedkit(state)) return false;
  for (const [r, v] of Object.entries(MEDKIT.cost)) state.resources[r] -= v;
  state.medkits = (state.medkits || 0) + 1;
  return true;
}
// Utilisable partout, même en plein combat : +40 PV, ou relève un survivant à terre
export function canUseMedkit(state, s) {
  return (state.medkits || 0) > 0 && (s.state === 'critical' || s.hp < 100);
}
export function useMedkit(state, s) {
  if (!canUseMedkit(state, s)) return false;
  state.medkits -= 1;
  if (s.state === 'critical') {
    s.state = 'injured';
    s.critical = 0;
    s.hp = MEDKIT.reviveHp;
  } else s.hp = Math.min(100, s.hp + MEDKIT.heal * (1 + fx(state, 'heal')));   // Médecine de fortune (recherche)
  bus.emit('crew:healed', s);
  bus.emit('crew:changed');
  return true;
}

export function addItem(state, type) {
  ensureInventory(state);
  const it = { id: 'i' + state.nextItemId++, type };
  state.inventory.push(it);
  return it;
}

const findItem = (state, id) => (id && state.inventory ? state.inventory.find(i => i.id === id) : null) || null;

export function weaponType(state, s) {
  const it = findItem(state, s.weapon);
  return it ? it.type : 'fists';
}
export function weaponOf(state, s) { return WEAPONS[weaponType(state, s)]; }

export function armorType(state, s) {
  const it = findItem(state, s.armor);
  return it ? it.type : null;
}
export function armorOf(state, s) {
  const t = armorType(state, s);
  return t ? ARMORS[t].armor : 0;
}

// Porteur d'un objet (ou null)
export function holderOf(state, itemId) {
  return state.crew.find(s => s.weapon === itemId || s.armor === itemId) || null;
}

export function freeItems(state, kind) {
  return (state.inventory || []).filter(i => itemKind(i.type) === kind && !holderOf(state, i.id));
}

// Équiper : l'objet passe d'un survivant à l'autre si besoin
export function equip(state, s, itemId) {
  const it = findItem(state, itemId);
  if (!it) return false;
  const kind = itemKind(it.type);
  const slot = kind === 'weapon' ? 'weapon' : 'armor';
  const prev = holderOf(state, itemId);
  if (prev) prev[slot] = null;
  s[slot] = itemId;
  bus.emit('crew:changed');
  return true;
}

export function unequip(state, s, slot) {
  if (!s[slot]) return false;
  s[slot] = null;
  bus.emit('crew:changed');
  return true;
}

// Un mort laisse son équipement dans l'inventaire (rien à faire : les objets restent dans state.inventory)

// Fabrication (en Halte)
export function canCraft(state, type) {
  const cost = CRAFT[type];
  return !!cost && Object.entries(cost).every(([r, v]) => (state.resources[r] || 0) >= v);
}

export function craft(state, type) {
  if (!canCraft(state, type)) return null;
  for (const [r, v] of Object.entries(CRAFT[type])) state.resources[r] -= v;
  const it = addItem(state, type);
  bus.emit('item:new', { item: it, source: 'craft' });
  return it;
}

function weightedPick(state, table) {
  const entries = Object.entries(table);
  const total = entries.reduce((a, [, w]) => a + w, 0);
  let r = rngNext(state) * total;
  for (const [k, w] of entries) { r -= w; if (r <= 0) return k; }
  return entries[entries.length - 1][0];
}

// Butin d'un ennemi abattu : parfois un objet
export function rollLoot(state, enemyType) {
  const L = LOOT[enemyType];
  if (!L || rngNext(state) > L.chance) return null;
  const it = addItem(state, weightedPick(state, L.items));
  bus.emit('item:new', { item: it, source: 'loot' });
  return it;
}

// Boss : tout son butin
export function bossLoot(state, bossType) {
  const L = LOOT[bossType];
  if (!L) return [];
  const out = Object.keys(L.items).map(t => addItem(state, t));
  out.forEach(it => bus.emit('item:new', { item: it, source: 'loot' }));
  return out;
}

// Équipement de départ d'une nouvelle partie
export function giveStartKit(state) {
  ensureInventory(state);
  for (const s of state.crew) {
    const type = START_KIT.equip[s.main];
    if (type) s.weapon = addItem(state, type).id;
  }
  for (const t of START_KIT.spare) addItem(state, t);
}

// Tirage d'un objet à vendre (gares)
export function randomShopItem(state) {
  const pool = { pipe: 3, knife: 2, leather: 3, machete: 2, crossbow: 2, pistol: 2, scrapplate: 2, rifle: 1, shotgun: 0.5, riot: 0.5 };
  return weightedPick(state, pool);
}
