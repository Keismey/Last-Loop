// Caméra le long du convoi (GDD §14.3) : défilement au doigt avec inertie et butées,
// deux zooms (vue proche ×1, vue convoi ×0,5) avec transition douce.
export const ZOOMS = [1, 0.5];

export const camera = {
  cx: null,        // centre de la vue, en unités du train (0 = avant de la locomotive, négatif vers l'arrière)
  zoomIdx: 0,
  zoom: 1,         // zoom affiché (glisse vers la cible)
  vel: 0,          // inertie, en unités par seconde
  dragging: false,
  follow: null,    // cible à suivre (boss) ; le joueur reprend la main en faisant défiler
  userT: 0
};
const FOLLOW_PAUSE = 2500;   // ms après un défilement du joueur avant que la caméra reprenne le suivi

let bounds = { rear: -600, front: 0 };

export function setTrainBounds(rear, front) {
  bounds = { rear, front };
}

// Limites du centre de vue pour une largeur d'écran donnée (en unités)
function clampCx(cx, viewUnits) {
  const half = viewUnits / 2;
  // Vue convoi (dézoom) : on peut aller environ un wagon plus loin de chaque côté (ennemis qui arrivent, ce qui vient en face)
  const margin = camera.zoomIdx === 1 ? 240 : 30;
  const lo = bounds.rear - margin + half;
  const hi = bounds.front + margin - half;
  if (lo > hi) return (bounds.rear + bounds.front) / 2;
  return Math.min(hi, Math.max(lo, cx));
}

// Mise à jour par image : zoom doux, inertie, butées. Renvoie l'échelle finale.
export function updateCamera(dt, baseScale, viewW) {
  const target = ZOOMS[camera.zoomIdx];
  camera.zoom += (target - camera.zoom) * Math.min(1, dt * 10);
  if (Math.abs(camera.zoom - target) < 0.002) camera.zoom = target;
  const S = baseScale * camera.zoom;
  const viewUnits = viewW / S;
  if (camera.cx === null) camera.cx = bounds.front - viewUnits * 0.36; // locomotive à droite au départ
  if (camera.follow !== null && !camera.dragging && !camera.vel && performance.now() - camera.userT > FOLLOW_PAUSE) {
    camera.cx += (camera.follow - camera.cx) * Math.min(1, dt * 2.5);
  }
  if (!camera.dragging && camera.vel) {
    camera.cx += camera.vel * dt;
    camera.vel *= Math.pow(0.04, dt);
    if (Math.abs(camera.vel) < 4) camera.vel = 0;
  }
  const clamped = clampCx(camera.cx, viewUnits);
  if (clamped !== camera.cx) camera.vel = 0;
  camera.cx = clamped;
  return S;
}

export function panBy(units) {
  camera.cx += units;
}

export function toggleZoom() {
  camera.zoomIdx = (camera.zoomIdx + 1) % ZOOMS.length;
}

export function centerOn(x) {
  camera.cx = x;
  camera.vel = 0;
}
