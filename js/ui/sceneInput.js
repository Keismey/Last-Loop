// Gestes sur la scène (GDD §14.3 et §14.4) :
// glisser = défiler le long du convoi (avec inertie) · double toucher = changer de zoom ·
// toucher la mini-carte = centrer la caméra · appui long sur un survivant = le saisir ·
// toucher court sur un survivant = sa fiche · sur un wagon = la fiche du wagon.
import { camera, panBy, toggleZoom, centerOn } from '../render/camera.js';
import { minimapHit } from '../render/minimap.js';
import { survivorAt, wagonAt } from '../render/crewLayer.js';
import { enemyAt } from '../render/enemies.js';
import { drag } from './dragState.js';
import { buzz } from './toasts.js';

const HOLD_MS = 180;

// cb : { getScale, onSurvivorTap(s), onWagonTap(w), onSurvivorHold(s, x, y) → bool, onEnemyTap(id) }
export function initSceneInput(el, cb) {
  let active = null;
  let lastTap = { t: 0, x: 0, y: 0 };
  let tapTimer = 0;

  const local = e => {
    const r = el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  el.addEventListener('pointerdown', e => {
    if (active || drag.active) return;
    const p = local(e);
    const hit = minimapHit(p.x, p.y);
    if (hit !== null) {
      centerOn(hit);
      camera.userT = performance.now();
      active = { id: e.pointerId, minimap: true };
      el.setPointerCapture(e.pointerId);
      return;
    }
    const who = survivorAt(p.x, p.y);
    active = { id: e.pointerId, x: p.x, y: p.y, lastX: p.x, lastT: e.timeStamp, moved: false, v: 0, who: who ? who.s : null, hold: 0 };
    camera.dragging = true;
    camera.vel = 0;
    el.setPointerCapture(e.pointerId);
    if (who) {
      const a = active;
      a.hold = setTimeout(() => {
        if (active !== a || a.moved) return;
        if (cb.onSurvivorHold(a.who, e.clientX, e.clientY)) {
          a.grabbed = true;
          camera.dragging = false;
        }
      }, HOLD_MS);
    }
  });

  el.addEventListener('pointermove', e => {
    if (!active || e.pointerId !== active.id || active.grabbed) return;
    const p = local(e);
    if (active.minimap) {
      const hit = minimapHit(p.x, p.y);
      if (hit !== null) centerOn(hit);
      return;
    }
    const dx = p.x - active.lastX;
    if (Math.abs(p.x - active.x) > 8 || Math.abs(p.y - active.y) > 8) {
      active.moved = true;
      clearTimeout(active.hold);
    }
    if (!active.moved) return;
    camera.userT = performance.now();      // le joueur reprend la main sur la caméra
    const S = cb.getScale();
    panBy(-dx / S);
    const dt = Math.max(1, e.timeStamp - active.lastT) / 1000;
    active.v = 0.7 * (-dx / S / dt) + 0.3 * active.v;
    active.lastX = p.x;
    active.lastT = e.timeStamp;
  });

  const end = e => {
    if (!active || e.pointerId !== active.id) return;
    clearTimeout(active.hold);
    camera.dragging = false;
    const a = active;
    active = null;
    if (a.minimap || a.grabbed) return;
    if (a.moved) {
      if (e.timeStamp - a.lastT < 80) camera.vel = a.v;
      return;
    }
    // Toucher : simple (fiche, après un court délai) ou double (zoom)
    const p = local(e);
    // Un ennemi touché devient la cible prioritaire, tout de suite (GDD §6.4)
    const foe = !a.who && enemyAt(p.x, p.y);
    if (foe && cb.onEnemyTap) { cb.onEnemyTap(foe.id); lastTap.t = 0; return; }
    const isDouble = e.timeStamp - lastTap.t < 300 && Math.hypot(p.x - lastTap.x, p.y - lastTap.y) < 30;
    if (isDouble) {
      clearTimeout(tapTimer);
      toggleZoom();
      buzz(10);
      lastTap.t = 0;
      return;
    }
    lastTap = { t: e.timeStamp, x: p.x, y: p.y };
    const who = a.who;
    tapTimer = setTimeout(() => {
      if (who) cb.onSurvivorTap(who);
      else {
        const w = wagonAt(p.x, p.y);
        if (w) cb.onWagonTap(w.wagon);
      }
    }, 300);
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', e => {
    if (active && e.pointerId === active.id) { clearTimeout(active.hold); camera.dragging = false; active = null; }
  });
}
