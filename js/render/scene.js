// Scène : paysage, voie, convoi, fumée, mini-carte (GDD §14.3).
// createScene() sert pour le jeu (caméra mobile, mini-carte) et pour l'écran titre.
import { CONFIG } from '../data/config.js';
import { BALANCE } from '../data/balance.js';
import { drawParallax, resetParallax } from './parallax.js';
import { drawLandscape } from './landscape.js';
import { drawSmooth } from './mip.js';
import { trainLayout, drawRails, drawTrain, updateSmoke, drawSmoke, shiftSmoke } from './train.js';
import { drawMinimap } from './minimap.js';
import { camera, setTrainBounds, updateCamera } from './camera.js';
import { getImage } from './assets.js';
import { trainSpeed } from '../sim/route.js';
import { drawCrew } from './crewLayer.js';
import { routeObjects, drawRouteObjects } from './sites.js';
import { drawFloaters } from './floaters.js';
import { drawEnemies } from './enemies.js';

export function refreshSceneArt() {
  resetParallax();
}

// options : { mode: 'game' | 'title', railAt, refHeight }
export function createScene(canvas, { mode = 'game', railAt = 0.84, refHeight = 220 } = {}) {
  const ctx = canvas.getContext('2d', { alpha: false });
  let W = 1, H = 1, DPR = 1;
  let lastS = 1;
  let lastCx = null;
  let clock = 0;
  let skyTime = 0;

  function resize() {
    const box = canvas.parentElement.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, CONFIG.DPR_MAX);
    W = Math.max(1, Math.round(box.width));
    H = Math.max(1, Math.round(box.height));
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
  }
  new ResizeObserver(resize).observe(canvas.parentElement);
  resize();

  const baseScale = () => Math.max(0.55, Math.min(1.6, H / refHeight));

  // Écran titre avec l'illustration Gemini : léger mouvement lent
  function drawKeyart(img, dtReal) {
    clock += dtReal;
    const zoom = 1.06 + Math.sin(clock * 0.05) * 0.02;
    const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight) * zoom;
    const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
    const x = (W - w) / 2 + Math.sin(clock * 0.07) * (w - W) * 0.3;
    const y = (H - h) / 2;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    drawSmooth(ctx, img, x, y, w, h);
  }

  function draw(state, alpha, dtReal, running) {
    if (!state || W < 2 || H < 2) return;
    if (mode === 'title') {
      const art = getImage('title_keyart');
      if (art) { drawKeyart(art, dtReal); return; }
    }
    const r = state.route;
    const distance = r.prevDistance + (r.distance - r.prevDistance) * alpha;
    const railY = Math.round(H * railAt);
    const s = baseScale();

    const cars = trainLayout(state);
    // Boss : la caméra le suit (bélier à l'arrière, puis le wagon qu'il frappe) et la limite s'étend derrière le train
    const boss = mode === 'game' && state.combat ? state.combat.enemies.find(e => e.boss && e.phase !== 'dead' && e.phase !== 'leave') : null;
    const rear = cars[cars.length - 1].x0;
    setTrainBounds(rear - (boss ? 230 : 0), cars[0].x1);
    if (mode === 'game') {
      if (!boss) camera.follow = null;
      else if (boss.bp === 'move' || boss.bp === 'strike') {
        const c = cars[Math.min(cars.length - 1, boss.wagon + 1)];
        camera.follow = (c.x0 + c.x1) / 2;
      } else camera.follow = rear + 40;    // le fourgon et le Roi tous les deux à l'écran
    }
    let S, cx;
    if (mode === 'game') {
      S = updateCamera(dtReal, s, W);
      cx = camera.cx;
    } else {
      S = s;
      cx = -(W / S) * 0.3;          // titre sans illustration : la locomotive à droite
    }
    if (lastCx !== null && cx !== lastCx) shiftSmoke(-(cx - lastCx) * S);
    lastCx = cx;
    lastS = S;

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const z = mode === 'game' ? camera.zoom : 1;
    const P = distance + cx;                       // position de la caméra le long de la voie
    skyTime += dtReal;
    let objects = null, drawObjects = null;
    if (mode === 'game' && r.mode) {
      const trainMid = (cars[cars.length - 1].x0 + cars[0].x1) / 2;
      objects = routeObjects(state, trainMid);
      drawObjects = baseY => drawRouteObjects(ctx, { W, S, P, baseY, state }, objects);
    }
    const drawn = drawLandscape(ctx, {
      W, H, S, z, P, railY, ring: r.ring, time: skyTime,
      clear: objects ? objects.map(o => o.X) : null, drawObjects
    });
    if (!drawn) {
      drawParallax(ctx, {
        w: W, h: H, dpr: DPR, ring: r.ring,
        distance: P * S,
        layerSpeeds: BALANCE.scroll.layerSpeeds,
        groundY: railY
      });
    }
    drawRails(ctx, W, railY, S, P * S);

    const view = { W, railY, S, cx, distance, running };
    const chimney = drawTrain(ctx, cars, view);
    if (mode === 'game' && state.crew) drawCrew(ctx, state, cars, view, skyTime);
    if (mode === 'game') drawEnemies(ctx, state, cars, view, skyTime);
    if (mode === 'game') drawFloaters(ctx, dtReal, cars, view);
    const trainPx = BALANCE.scroll.nearPxPerSec * trainSpeed(state) * S;
    updateSmoke(running ? dtReal : dtReal * 0.3, chimney, running ? trainPx : 0, S, true);
    drawSmoke(ctx);

    const v = ctx.createLinearGradient(0, 0, 0, H);
    v.addColorStop(0, 'rgba(43,42,51,0.18)');
    v.addColorStop(0.2, 'rgba(43,42,51,0)');
    v.addColorStop(0.9, 'rgba(43,42,51,0)');
    v.addColorStop(1, 'rgba(43,42,51,0.3)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);

    if (mode === 'game') drawMinimap(ctx, cars, { W, H, S, cx });
  }

  return { draw, resize, getScale: () => lastS };
}
