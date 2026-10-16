// Glisser-déposer des survivants (GDD §14.4).
// Appui long (180 ms) sur un survivant → il se soulève et suit le doigt ;
// lâché sur un poste = affectation (échange si occupé), sur un wagon en panne = réparation,
// sur un Dormoir ou le bandeau = repos,
// ailleurs = retour à sa place. Près des bords de la scène, la caméra défile toute seule.
import { drag } from './dragState.js';
import { slotAt, wagonAt, hits } from '../render/crewLayer.js';
import { drawPuppet } from '../render/puppets.js';
import { WAGONS } from '../data/wagons.js';
import { assign, unassign, rescue, canWork, displayName } from '../sim/crew.js';
import { panBy } from '../render/camera.js';
import { sendToRepair } from '../sim/route.js';
import { sendToDefend } from '../sim/defense.js';
import { toast, buzz } from './toasts.js';
import { t } from '../core/i18n.js';

let ctx = null;  // { sceneEl, barEl, ghostEl, getState, getScale }

export function initDrag(opts) {
  ctx = opts;
  window.addEventListener('pointermove', onMove, { passive: false });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onCancel);
}

export function beginDrag(s, clientX, clientY) {
  if (s.state === 'injured') {
    toast(t('crew.cannotDrag', { name: displayName(s) }), 'warn');
    return false;
  }
  drag.active = true;
  drag.survivor = s;
  drag.hoverSlot = null;
  drag.hoverBunk = null;
  drag.hoverRepair = null;
  drag.overBar = false;
  // Fantôme qui suit le doigt
  const g = ctx.ghostEl;
  const c = g.querySelector('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = 64 * dpr;
  c.height = 80 * dpr;
  const gc = c.getContext('2d');
  gc.setTransform(dpr, 0, 0, dpr, 0, 0);
  gc.clearRect(0, 0, 64, 80);
  drawPuppet(gc, s, 32, 74, 1.45, s.state === 'critical' ? 'injured' : 'carry', 0, false);
  g.hidden = false;
  moveTo(clientX, clientY);
  buzz(10);
  return true;
}

function sceneLocal(x, y) {
  const r = ctx.sceneEl.getBoundingClientRect();
  return { x: x - r.left, y: y - r.top, inside: x >= r.left && x <= r.right && y >= r.top && y <= r.bottom, rect: r };
}

function moveTo(x, y) {
  drag.x = x;
  drag.y = y;
  ctx.ghostEl.style.transform = `translate(${x - 32}px, ${y - 84}px) scale(1.05)`;
  const p = sceneLocal(x, y);
  const s = drag.survivor;
  drag.hoverSlot = null;
  drag.hoverBunk = null;
  drag.hoverRepair = null;
  drag.hoverDefend = null;
  if (p.inside) {
    if (canWork(s)) drag.hoverSlot = slotAt(p.x, p.y + 18);
    // Lâcher n'importe où sur un wagon : premier poste libre de ce wagon
    if (!drag.hoverSlot && canWork(s)) {
      const w0 = wagonAt(p.x, p.y);
      if (w0) drag.hoverSlot = hits.slots.find(h => h.wagon === w0.wagon && (!h.occupied || h.occupied === s)) || null;
    }
    if (!drag.hoverSlot) {
      const w = wagonAt(p.x, p.y);
      // Wagon en panne : un survivant valide part le réparer (un survivant critique, lui, va se coucher)
      if (w && w.wagon.broken && canWork(s)) drag.hoverRepair = w.wagon;
      else if (w && w.wagon.attacked && canWork(s)) drag.hoverDefend = w.wagon;
      else if (w && (WAGONS[w.wagon.type].beds || w.wagon.berths)) drag.hoverBunk = w.wagon;
    }
  }
  const b = ctx.barEl.getBoundingClientRect();
  drag.overBar = x >= b.left && x <= b.right && y >= b.top && y <= b.bottom;
  ctx.barEl.classList.toggle('drop-target', drag.overBar);
}

function onMove(e) {
  if (!drag.active) return;
  e.preventDefault();
  moveTo(e.clientX, e.clientY);
}

function finish() {
  drag.active = false;
  drag.survivor = null;
  drag.hoverSlot = null;
  drag.hoverBunk = null;
  drag.hoverRepair = null;
  drag.hoverDefend = null;
  ctx.ghostEl.hidden = true;
  ctx.barEl.classList.remove('drop-target');
}

function onUp() {
  if (!drag.active) return;
  const state = ctx.getState();
  const s = drag.survivor;
  const slot = drag.hoverSlot;
  if (slot && canWork(s)) {
    const other = slot.occupied && slot.occupied !== s ? slot.occupied : null;
    if (assign(state, s, slot.wagon.id, slot.slot)) {
      toast(other
        ? t('crew.swapped', { a: displayName(s), b: displayName(other) })
        : t('crew.assigned', { name: displayName(s), wagon: t('wagon.' + slot.wagon.type) }));
      buzz(15);
    }
  } else if (drag.hoverDefend) {
    const w = drag.hoverDefend;
    if (sendToDefend(state, s, w)) {
      toast(t('crew.toDefend', { name: displayName(s), wagon: t('wagonThe.' + w.type) }));
      buzz(15);
    }
  } else if (drag.hoverRepair) {
    const w = drag.hoverRepair;
    if (sendToRepair(state, s, w)) {
      toast(t('crew.toRepair', { name: displayName(s), wagon: t('wagonThe.' + w.type) }));
      buzz(15);
    }
  } else if (drag.hoverBunk || drag.overBar) {
    if (s.state === 'critical') {
      if (rescue(state, s)) { toast(t('crew.rescued', { name: displayName(s) })); buzz(15); }
    } else if (unassign(state, s)) {
      toast(t('crew.toRest', { name: displayName(s) }));
      buzz(15);
    }
  }
  finish();
}

function onCancel() {
  if (drag.active) finish();
}

// Défilement automatique près des bords de la scène (à appeler à chaque image)
export function tickDrag(dt) {
  if (!drag.active) return;
  const p = sceneLocal(drag.x, drag.y);
  if (!p.inside) return;
  const edge = 36;
  const S = ctx.getScale();
  if (p.x < edge) panBy(-((edge - p.x) / edge) * 420 * dt / S);
  else if (p.x > p.rect.width - edge) panBy(((p.x - (p.rect.width - edge)) / edge) * 420 * dt / S);
  else return;
  moveTo(drag.x, drag.y);
}
