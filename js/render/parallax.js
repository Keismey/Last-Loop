// Paysage en parallaxe sur 3 couches (GDD §14.3 et §15.4).
// Si l'image Gemini d'une couche existe, elle est utilisée ; sinon le code dessine un décor provisoire
// des Plaines de Cendre. Les couches s'enchaînent en miroir (normale, retournée, normale…) : aucun raccord visible.
import { getImage } from './assets.js';
import { makeRng } from '../core/rng.js';
import { BACKGROUNDS, SUN } from '../data/backgrounds.js';

const TILE = 960;   // largeur d'un pavé dessiné par le code, en px CSS
let cache = { h: 0, dpr: 0, ring: 0, layers: null };

function makeCanvas(w, h, dpr) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * dpr);
  c.height = Math.ceil(h * dpr);
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  return [c, g];
}

// Courbe périodique sur la largeur du pavé (somme de sinus à fréquences entières)
function ridge(rand, base, amp, harmonics) {
  const terms = [];
  for (let k = 1; k <= harmonics; k++) {
    terms.push({ k, a: amp * (0.5 + rand()) / k, p: rand() * Math.PI * 2 });
  }
  return x => base + terms.reduce((y, tm) => y + tm.a * Math.sin((2 * Math.PI * tm.k * x) / TILE + tm.p), 0);
}

function fillRidge(g, f, h, color) {
  g.beginPath();
  g.moveTo(0, h);
  for (let x = 0; x <= TILE; x += 8) g.lineTo(x, f(x));
  g.lineTo(TILE, h);
  g.closePath();
  g.fillStyle = color;
  g.fill();
}

function pylon(g, x, baseY, height, lean, color) {
  const w = height * 0.22;
  g.save();
  g.translate(x, baseY);
  g.rotate(lean);
  g.strokeStyle = color;
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(-w / 2, 0); g.lineTo(-w * 0.12, -height);
  g.moveTo(w / 2, 0); g.lineTo(w * 0.12, -height);
  for (let i = 1; i < 5; i++) {
    const y = -height * (i / 5);
    const half = (w / 2) * (1 - i / 5) + w * 0.12 * (i / 5);
    g.moveTo(-half, y); g.lineTo(half, y - height / 5);
    g.moveTo(half, y); g.lineTo(-half, y - height / 5);
  }
  g.moveTo(-w * 0.55, -height * 0.82); g.lineTo(w * 0.55, -height * 0.82);
  g.stroke();
  g.restore();
  return { x: x + Math.sin(lean) * height, y: baseY - height * 0.82 };
}

// Couche lointaine : ciel orangé, soleil voilé, horizon de fermes mortes
function drawFar(g, h, rand) {
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#7a3d2e');
  sky.addColorStop(0.45, '#d4853f');
  sky.addColorStop(0.72, '#e8c08a');
  sky.addColorStop(1, '#c9a27a');
  g.fillStyle = sky;
  g.fillRect(0, 0, TILE, h);

  const sx = TILE * 0.68, sy = h * 0.3, sr = h * 0.08;
  const glow = g.createRadialGradient(sx, sy, sr * 0.5, sx, sy, sr * 4);
  glow.addColorStop(0, 'rgba(248,226,178,0.55)');
  glow.addColorStop(1, 'rgba(248,226,178,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, TILE, h);
  g.fillStyle = '#f6e2b4';
  g.beginPath(); g.arc(sx, sy, sr, 0, Math.PI * 2); g.fill();

  const horizon = h * 0.6;
  fillRidge(g, ridge(rand, horizon - h * 0.03, h * 0.03, 4), h, '#a8867a');
  // Silhouettes lointaines : silos et pylônes
  g.fillStyle = '#93766f';
  for (let i = 0; i < 4; i++) {
    const x = 80 + rand() * (TILE - 160);
    const w = 10 + rand() * 8, hh = h * (0.06 + rand() * 0.05);
    g.fillRect(x, horizon - hh, w, hh + 6);
    g.beginPath(); g.arc(x + w / 2, horizon - hh, w / 2, Math.PI, 0); g.fill();
  }
  for (let i = 0; i < 5; i++) pylon(g, 60 + rand() * (TILE - 120), horizon + 2, h * 0.09, 0, '#93766f');
  fillRidge(g, ridge(rand, horizon + h * 0.03, h * 0.015, 3), h, '#9b7c73');
  const haze = g.createLinearGradient(0, horizon - h * 0.1, 0, horizon + h * 0.1);
  haze.addColorStop(0, 'rgba(232,192,138,0)');
  haze.addColorStop(1, 'rgba(232,192,138,0.35)');
  g.fillStyle = haze;
  g.fillRect(0, horizon - h * 0.1, TILE, h * 0.2);
}

// Couche moyenne : collines de cendre, pylônes penchés, granges en ruine
function drawMid(g, h, rand) {
  const f = ridge(rand, h * 0.66, h * 0.05, 5);
  fillRidge(g, f, h, '#6f5f62');
  const tops = [];
  const count = 4;
  for (let i = 0; i < count; i++) {
    const x = 70 + (i + rand() * 0.5) * ((TILE - 140) / count);
    tops.push(pylon(g, x, f(x) + 3, h * 0.2, (rand() - 0.5) * 0.18, '#3f363d'));
  }
  g.strokeStyle = 'rgba(43,42,51,0.6)';
  g.lineWidth = 1;
  for (let i = 0; i < tops.length - 1; i++) {
    const a = tops[i], b = tops[i + 1];
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.quadraticCurveTo((a.x + b.x) / 2, Math.max(a.y, b.y) + h * 0.05, b.x, b.y);
    g.stroke();
  }
  // Grange en ruine
  const bx = 120 + rand() * (TILE - 300), by = f(bx) + 4, bw = h * 0.22, bh = h * 0.12;
  g.fillStyle = '#4a3c40';
  g.beginPath();
  g.moveTo(bx, by); g.lineTo(bx, by - bh); g.lineTo(bx + bw * 0.35, by - bh * 1.55);
  g.lineTo(bx + bw * 0.55, by - bh * 1.2); g.lineTo(bx + bw * 0.62, by - bh * 1.35);
  g.lineTo(bx + bw, by - bh * 0.9); g.lineTo(bx + bw, by);
  g.closePath();
  g.fill();
  g.fillStyle = '#2b2a33';
  g.fillRect(bx + bw * 0.4, by - bh * 0.55, bw * 0.18, bh * 0.55);
}

// Couche proche : sol de cendre, touffes sèches, cailloux, piquets de clôture
function drawNear(g, h, rand, groundY) {
  const top = ridge(rand, groundY - 2, 2, 6);
  const ground = g.createLinearGradient(0, groundY - 6, 0, h);
  ground.addColorStop(0, '#5f5559');
  ground.addColorStop(1, '#3b3439');
  g.beginPath();
  g.moveTo(0, h);
  for (let x = 0; x <= TILE; x += 6) g.lineTo(x, top(x));
  g.lineTo(TILE, h);
  g.closePath();
  g.fillStyle = ground;
  g.fill();

  // Piquets de clôture, en arrière de la voie
  g.fillStyle = '#3a3036';
  for (let x = 30 + rand() * 40; x < TILE - 30; x += 70 + rand() * 50) {
    const ph = 14 + rand() * 8, lean = (rand() - 0.5) * 0.3;
    g.save(); g.translate(x, top(x) + 1); g.rotate(lean); g.fillRect(-1.5, -ph, 3, ph); g.restore();
  }
  // Touffes d'herbe sèche
  g.strokeStyle = '#a3916d';
  g.lineWidth = 1.3;
  for (let i = 0; i < 60; i++) {
    const x = 10 + rand() * (TILE - 20), y = top(x) + rand() * (h - groundY) * 0.9;
    for (let k = -2; k <= 2; k++) {
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + k * 2 + (rand() - 0.5) * 2, y - 5 - rand() * 5); g.stroke();
    }
  }
  // Cailloux
  for (let i = 0; i < 26; i++) {
    const x = 10 + rand() * (TILE - 20), y = top(x) + 4 + rand() * (h - groundY - 6);
    g.fillStyle = rand() > 0.5 ? '#7a6f74' : '#6a6065';
    g.beginPath(); g.ellipse(x, y, 2 + rand() * 4, 1.5 + rand() * 2, 0, 0, Math.PI * 2); g.fill();
  }
}

// Couche venant d'une image Gemini : bande placée selon BACKGROUNDS
function imageLayer(id, name, H, groundY) {
  const img = getImage(id);
  if (!img) return null;
  const cfg = BACKGROUNDS[name];
  const lh = cfg.h * H;
  let y = 0;
  if (cfg.place === 'aboveRail') y = groundY + cfg.offset * H - lh;
  else if (cfg.place === 'rail') y = groundY - cfg.railFrac * lh;
  return { canvas: img, w: (lh * img.naturalWidth) / img.naturalHeight * cfg.stretch, h: lh, y, image: true };
}

function build(h, dpr, ring, groundY) {
  const rand = makeRng(1000 + ring);
  const layers = [];
  const painters = [drawFar, drawMid, (g, hh, r) => drawNear(g, hh, r, groundY)];
  ['far', 'mid', 'near'].forEach((name, i) => {
    const fromImage = imageLayer(`bg_c${ring}_${name}`, name, h, groundY);
    if (fromImage) { layers.push(fromImage); return; }
    const [c, g] = makeCanvas(TILE, h, dpr);
    painters[i](g, h, rand);
    layers.push({ canvas: c, w: TILE, h, y: 0, image: false });
  });
  return layers;
}

// Soleil fixe, posé sur la couche lointaine quand elle vient d'une image
function drawSun(ctx, w, h, ring) {
  const sun = SUN[ring];
  if (!sun) return;
  const x = sun.x * w, y = sun.y * h, r = sun.r * h;
  const glow = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 4);
  glow.addColorStop(0, sun.glow + '0.55)');
  glow.addColorStop(1, sun.glow + '0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
  ctx.fillStyle = sun.color;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

// Dessine un pavé en boucle miroir : période de deux pavés
function drawTiled(ctx, layer, offset, viewW) {
  const h = layer.h, top = layer.y;
  const tw = layer.w;
  const period = tw * 2;
  const o = ((offset % period) + period) % period;
  let x = -o;
  let i = 0;
  while (x < viewW) {
    if (x + tw > 0) {
      if (i % 2 === 1) {
        ctx.save();
        ctx.translate(x + tw, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(layer.canvas, 0, top, tw, h);
        ctx.restore();
      } else {
        ctx.drawImage(layer.canvas, x, top, tw, h);
      }
    }
    x += tw;
    i += 1;
  }
}

export function drawParallax(ctx, { w, h, dpr, ring, distance, layerSpeeds, groundY }) {
  if (cache.h !== h || cache.dpr !== dpr || cache.ring !== ring || !cache.layers) {
    cache = { h, dpr, ring, layers: build(h, dpr, ring, groundY) };
  }
  // Fond uni sous les bandes (ciel en haut, sol en bas)
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#d9893c');
  bg.addColorStop(0.55, '#e3a85a');
  bg.addColorStop(0.56, '#6a6266');
  bg.addColorStop(1, '#4b4448');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  cache.layers.forEach((layer, i) => {
    drawTiled(ctx, layer, distance * layerSpeeds[i], w);
    if (i === 0 && layer.image) drawSun(ctx, w, h, ring);
  });
}

// À appeler quand de nouvelles images sont chargées
export function resetParallax() {
  cache.layers = null;
}
