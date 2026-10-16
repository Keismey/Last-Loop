// Équipement dans l'interface : section « Équipement » de la fiche survivant, arsenal et fabrication.
import { t, dec, fixed } from '../core/i18n.js';
import { el } from './modal.js';
import { icon } from './icons.js';
import { toast, buzz } from './toasts.js';
import { costEl } from './stationPanel.js';
import { WEAPONS, ARMORS, CRAFT, itemKind } from '../data/items.js';
import { weaponType, armorType, freeItems, equip, unequip, holderOf, canCraft, craft, canUseMedkit, useMedkit, canCraftMedkit, craftMedkit, salvageOf, dismantleItem } from '../sim/equipment.js';
import { MEDKIT } from '../data/items.js';
import { efficiency, displayName } from '../sim/crew.js';
import { isHalte } from '../sim/route.js';
import { refreshPanel } from './panels.js';

let picking = null;
let armed = null;      // objet dont le démantèlement attend la confirmation (second toucher)   // { id, slot } : choix d'objet en cours dans la fiche d'un survivant

// Description courte d'un objet : « 4 dégâts/s · corps à corps » ou « −30 % de coups »
export function itemStats(type) {
  const W = WEAPONS[type];
  if (W) {
    const range = W.range === 0 ? t('item.melee') : t('item.range', { n: W.range });
    return t('item.dps', { v: dec(W.dps) }) + ' · ' + range + (W.ammo ? ' · ' + t('item.ammo') : '');
  }
  const A = ARMORS[type];
  return A ? t('item.armor', { p: Math.round(A.armor * 100) }) : '';
}

function slotRow(getState, s, slot) {
  const state = getState();
  const type = slot === 'weapon' ? weaponType(state, s) : armorType(state, s);
  const name = type ? t('item.' + type) : t('item.none');
  const b = el('button', { class: 'btn btn-small', type: 'button', text: t('gear.change') });
  b.addEventListener('click', () => { picking = picking && picking.slot === slot && picking.id === s.id ? null : { id: s.id, slot }; });
  const ico = el('span', { class: 'stat-ico' });
  ico.innerHTML = icon(slot === 'weapon' ? 'com' : 'shield');
  return el('div', { class: 'gear-row' }, ico,
    el('div', { class: 'gear-text' }, el('strong', { text: name }), el('span', { class: 'muted small', text: type ? itemStats(type) : '' })), b);
}

function pickList(getState, s, slot) {
  const state = getState();
  const kind = slot === 'weapon' ? 'weapon' : 'armor';
  const items = freeItems(state, kind);
  const box = el('div', { class: 'gear-pick' });
  if (!items.length) box.appendChild(el('p', { class: 'muted small', text: t('gear.noneFree') }));
  for (const it of items) {
    const c = el('button', { class: 'chip gear-chip', type: 'button' },
      el('strong', { text: t('item.' + it.type) }), el('span', { class: 'small', text: itemStats(it.type) }));
    c.addEventListener('click', () => { equip(getState(), s, it.id); picking = null; buzz(10); });
    box.appendChild(c);
  }
  if (s[slot]) {
    const off = el('button', { class: 'chip', type: 'button', text: t('gear.remove') });
    off.addEventListener('click', () => { unequip(getState(), s, slot); picking = null; });
    box.appendChild(off);
  }
  return box;
}

// Section de la fiche survivant
// Trousse de soins (fiche survivant) : +40 PV, ou relève un survivant à terre
export function medkitButton(getState, s) {
  const state = getState();
  const n = state.medkits || 0;
  const label = s.state === 'critical' ? t('medkit.revive', { n }) : t('medkit.use', { n, h: MEDKIT.heal });
  const b = el('button', { class: 'btn btn-small' + (s.state === 'critical' ? ' btn-primary' : ''), type: 'button',
    disabled: canUseMedkit(state, s) ? null : 'disabled', text: label });
  b.addEventListener('click', () => { if (useMedkit(getState(), s)) { toast(t('medkit.done', { name: displayName(s) })); buzz([15, 30, 15]); } });
  return b;
}

export function gearSection(getState, s) {
  const state = getState();
  const W = WEAPONS[weaponType(state, s)];
  const power = W.dps * efficiency(s, 'com');
  const box = el('div', { class: 'skills gear' },
    el('p', { class: 'muted small', text: t('gear.power', { v: fixed(power) }) }));
  for (const slot of ['weapon', 'armor']) {
    box.appendChild(slotRow(getState, s, slot));
    if (picking && picking.id === s.id && picking.slot === slot) box.appendChild(pickList(getState, s, slot));
  }
  return box;
}

// Arsenal du train (onglet Équipage › Arsenal)
export function arsenalSection(getState) {
  const state = getState();
  const box = el('div', { class: 'arsenal' });
  const inv = state.inventory || [];
  if (!inv.length) box.appendChild(el('p', { class: 'muted small', text: t('gear.empty') }));
  const list = el('div', { class: 'arsenal-list' });
  for (const it of inv) {
    const h = holderOf(state, it.id);
    const chip = el('span', { class: 'arsenal-item' + (h ? '' : ' free') },
      el('strong', { text: t('item.' + it.type) }), el('span', { class: 'muted small', text: h ? displayName(h) : t('gear.free') }));
    chip.title = itemStats(it.type);
    // Objet libre : on peut le démanteler (deux touchers : le premier demande confirmation)
    if (!h) {
      const yieldOf = salvageOf(it.type);
      const db = el('button', { class: 'btn btn-small btn-ghost dismantle' + (armed === it.id ? ' armed' : ''), type: 'button' },
        document.createTextNode((armed === it.id ? t('gear.dismantleSure') : t('gear.dismantle')) + ' '), costEl(yieldOf));
      db.addEventListener('click', () => {
        if (armed !== it.id) { armed = it.id; buzz(8); refreshPanel(true); return; }
        armed = null;
        const got = dismantleItem(getState(), it.id);
        if (got) { toast(t('gear.dismantled', { item: t('item.' + it.type) })); buzz([15, 30, 15]); }
        refreshPanel(true);
      });
      chip.appendChild(db);
    }
    list.appendChild(chip);
  }
  box.appendChild(list);
  // Trousses de soins
  const halte = isHalte(state);
  const mk = el('button', { class: 'btn btn-small', type: 'button', disabled: halte && canCraftMedkit(state) ? null : 'disabled' },
    document.createTextNode(t('medkit.craft') + ' '), costEl(MEDKIT.cost));
  mk.addEventListener('click', () => { if (craftMedkit(getState())) buzz(10); });
  box.appendChild(el('div', { class: 'gear-row' }, el('div', { class: 'gear-text' },
    el('strong', { text: t('medkit.count', { n: state.medkits || 0 }) }), el('span', { class: 'muted small', text: t('medkit.help') })), mk));
  return box;
}

// Fabrication d'armes et d'armures (onglet Équipage › Fabrication), seulement pendant une Halte
export function craftSection(getState) {
  const state = getState();
  const halte = isHalte(state);
  const box = el('div', { class: 'arsenal' });
  box.appendChild(el('p', { class: 'muted small', text: t(halte ? 'gear.craftHalte' : 'gear.craftNotHalte') }));
  const grid = el('div', { class: 'build-grid' });
  for (const type of Object.keys(CRAFT)) {
    const ok = halte && canCraft(state, type);
    const b = el('button', { class: 'build-card', type: 'button', disabled: ok ? null : 'disabled' },
      el('span', { class: 'build-card-head' }, el('strong', { text: t('item.' + type) })),
      el('span', { class: 'muted small', text: itemStats(type) }),
      costEl(CRAFT[type]));
    b.addEventListener('click', () => {
      const it = craft(getState(), type);
      if (it) { toast(t('gear.crafted', { name: t('item.' + type) })); buzz([15, 30, 15]); }
    });
    grid.appendChild(b);
  }
  box.appendChild(grid);
  return box;
}

export { itemKind };
