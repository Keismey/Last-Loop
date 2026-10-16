// Bandeau d'équipage (GDD §14.6) : tout l'équipage. D'abord les survivants libres, au repos, blessés ou
// critiques, puis (après un filet) ceux qui travaillent, avec la couleur de leur wagon.
// Appui long = glisser vers un poste ; toucher court = fiche du survivant. Bouton « Auto ».
import { t } from '../core/i18n.js';
import { el } from './modal.js';
import { icon } from './icons.js';
import { portrait, countArgs } from './sheets.js';
import { beginDrag } from './dragdrop.js';
import { autoAssign, displayName } from '../sim/crew.js';
import { toast, buzz } from './toasts.js';
import { bus } from '../core/bus.js';
import { WAGONS } from '../data/wagons.js';
import { carById } from '../sim/caboose.js';

const narrow = matchMedia('(max-width: 760px)');

let refs = null;
const HOLD_MS = 180;

export function initCrewBar(box, { getState, onOpenSurvivor }) {
  box.innerHTML = '';
  const head = el('div', { class: 'crew-head' },
    el('p', { class: 'panel-title', text: t('crew.title') }),
    el('span', { class: 'crew-count' }));
  const autoBtn = el('button', { class: 'chip chip-auto', type: 'button' });
  autoBtn.innerHTML = icon('auto') + `<span>${t('crew.auto')}</span>`;
  autoBtn.addEventListener('click', () => {
    const changed = autoAssign(getState());
    toast(changed ? t('crew.autoDone') : t('crew.autoNone'));
    buzz(10);
  });
  head.appendChild(autoBtn);
  const list = el('div', { class: 'crew-items' });
  box.append(head, list);
  refs = { box, list, count: head.querySelector('.crew-count'), getState, onOpenSurvivor, items: new Map() };
  bus.on('crew:changed', rebuild);
  rebuild();
}

function hpArc(s) {
  const pct = Math.max(0, Math.min(1, s.hp / 100));
  const deg = Math.round(pct * 360);
  const color = s.state === 'critical' ? '#C8382D' : s.hp < 30 ? '#C8382D' : s.hp < 70 ? '#E8A33D' : '#8fd17e';
  return `conic-gradient(${color} ${deg}deg, rgba(237,230,214,0.15) ${deg}deg)`;
}

export function rebuild() {
  if (!refs) return;
  const state = refs.getState();
  if (!state) return;
  refs.list.innerHTML = '';
  refs.items.clear();
  // Tout l'équipage : d'abord ceux qu'on peut placer (au repos, à terre), puis ceux qui travaillent
  const rank = s => (s.state === 'critical' ? 0 : !s.post && s.state !== 'injured' ? 1 : s.state === 'injured' && !s.post ? 2 : 3);
  const shown = [...state.crew].sort((a, b) => rank(a) - rank(b));
  let sep = false;
  for (const s of shown) {
    if (s.post && !sep) {
      sep = true;
      if (shown[0] !== s) refs.list.appendChild(el('span', { class: 'crew-sep' }));
    }
    const ring = el('span', { class: 'crew-ring' });
    ring.appendChild(portrait(s, 38));
    const badge = el('span', { class: 'crew-skill' });
    ring.appendChild(badge);
    const where = el('span', { class: 'crew-where' });
    ring.appendChild(where);
    const item = el('button', { class: 'crew-item state-' + s.state + (s.post ? ' working' : ''), type: 'button', 'aria-label': displayName(s) },
      ring,
      el('span', { class: 'crew-name', text: s.first }));
    item.querySelector('.crew-skill').innerHTML = icon(s.main) + `<span class="num">${s.skills[s.main]}</span>`;
    placeBadge(state, s, where);
    attachPress(item, s);
    refs.list.appendChild(item);
    refs.items.set(s.id, { item, ring });
  }
  updateCrewBar();
}

// Pastille « où il est » : couleur du wagon au travail, rouge en renfort, bleu nuit au repos
function placeBadge(state, s, where) {
  if (s.post && s.post.slot === 'defend') { where.className = 'crew-where fight'; where.title = t('crew.badgeDefend'); return; }
  if (s.post) {
    const w = carById(state, s.post.wagon);
    where.style.background = (w && WAGONS[w.type] && WAGONS[w.type].color) || '#6e6a6f';
    where.title = w ? t('wagon.' + w.type) : '';
    return;
  }
  where.className = 'crew-where rest';
  where.title = t('crew.badgeRest');
}

// Mise à jour légère (anneaux de santé, compteur)
export function updateCrewBar() {
  if (!refs) return;
  const state = refs.getState();
  if (!state) return;
  refs.count.textContent = t(narrow.matches ? 'crew.countShort' : 'crew.count', countArgs(state));
  for (const s of state.crew) {
    const r = refs.items.get(s.id);
    if (!r) continue;
    r.ring.style.background = hpArc(s);
    r.item.classList.toggle('blink', s.state === 'critical');
  }
}

// Le bandeau défile à la main (touch-action: none), pour que le navigateur n'interrompe jamais un glisser.
function attachPress(item, s) {
  let timer = 0, start = null, dragged = false, scrolling = false, lastX = 0;
  item.addEventListener('pointerdown', e => {
    start = { x: e.clientX, y: e.clientY };
    lastX = e.clientX;
    dragged = false;
    scrolling = false;
    try { item.setPointerCapture(e.pointerId); } catch (err) { /* sans conséquence */ }
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!start) return;
      dragged = beginDrag(s, start.x, start.y);
      start = null;
    }, HOLD_MS);
  });
  item.addEventListener('pointermove', e => {
    if (dragged) return;
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) {
      clearTimeout(timer);
      start = null;
      scrolling = true;        // c'était un défilement du bandeau
    }
    if (scrolling) refs.list.scrollLeft -= e.clientX - lastX;
    lastX = e.clientX;
  });
  const end = () => {
    clearTimeout(timer);
    if (start && !dragged) refs.onOpenSurvivor(s.id);
    start = null;
    scrolling = false;
  };
  item.addEventListener('pointerup', end);
  item.addEventListener('pointercancel', () => { clearTimeout(timer); start = null; scrolling = false; });
  item.addEventListener('contextmenu', e => e.preventDefault());
}
