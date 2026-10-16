// Sites le long de la voie (arrêts, dépôt) et poteaux d'aiguillage.
// En attendant les images Gemini des sites, chaque site est composé avec les éléments de décor existants
// et quelques formes dessinées par le code. L'état du site (stock, attitude) se voit dans le dessin.
import { getImage } from './assets.js';
import { drawSmooth } from './mip.js';
import { LANDSCAPE } from '../data/landscape.js';
import { ATTITUDE_COLORS, SITE_ART, CAMP_ART } from '../data/sites.js';
import { currentBranch, sitePos, junctionPos } from '../sim/route.js';

const INK = '#2B2A33';
export const SITE_DEPTH = 0.86;

function deco(ctx, id, cx, baseY, k, hScale = 1, flip = false) {
  const img = getImage(id);
  if (!img) return;
  const h = LANDSCAPE.decoHeights[id] * k * hScale;
  const w = h * img.naturalWidth / img.naturalHeight;
  if (flip) {
    ctx.save(); ctx.translate(cx, 0); ctx.scale(-1, 1);
    drawSmooth(ctx, img, -w / 2, baseY - h * 0.97, w, h);
    ctx.restore();
  } else {
    drawSmooth(ctx, img, cx - w / 2, baseY - h * 0.97, w, h);
  }
}

function outline(ctx, k) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, 2.2 * k);
  ctx.lineJoin = 'round';
}

function flag(ctx, x, baseY, k, color) {
  const h = 120 * k;
  outline(ctx, k);
  ctx.beginPath(); ctx.moveTo(x, baseY); ctx.lineTo(x, baseY - h); ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, baseY - h); ctx.lineTo(x + 34 * k, baseY - h + 10 * k); ctx.lineTo(x, baseY - h + 22 * k); ctx.closePath();
  ctx.fill(); ctx.stroke();
}

// ---------- Compositions provisoires ----------
// Les sites sont derrière le train : seuls les éléments hauts dépassent des wagons. Chaque site a donc
// au moins un élément de plus de 150 unités (5 à 6 m) pour rester reconnaissable.
function field(ctx, x, y, k, stock) {
  const w = 440 * k;
  const h = (50 + stock * 110) * k;                 // hauteur des épis : le stock se voit de loin
  for (let i = 0; i < 26; i++) {
    const fx = x - w / 2 + (i + 0.5) * (w / 26);
    const hh = h * (0.8 + ((i * 53) % 7) / 25);
    ctx.strokeStyle = stock > 0.4 ? '#9fae4f' : '#b59a52';
    ctx.lineWidth = Math.max(1, 3 * k);
    ctx.beginPath(); ctx.moveTo(fx, y); ctx.quadraticCurveTo(fx + 4 * k, y - hh * 0.5, fx + ((i % 3) - 1) * 6 * k, y - hh); ctx.stroke();
    ctx.fillStyle = stock > 0.4 ? '#d9b44a' : '#a8905a';
    ctx.beginPath(); ctx.ellipse(fx + ((i % 3) - 1) * 6 * k, y - hh, 4 * k, 9 * k, 0, 0, Math.PI * 2); ctx.fill();
  }
  // Épouvantail
  const sx = x + w * 0.2, top = y - 165 * k;
  outline(ctx, k);
  ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(sx, top); ctx.moveTo(sx - 34 * k, top + 34 * k); ctx.lineTo(sx + 34 * k, top + 34 * k); ctx.stroke();
  ctx.fillStyle = '#8f4426';
  ctx.beginPath(); ctx.roundRect(sx - 15 * k, top + 26 * k, 30 * k, 42 * k, 4 * k); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#d9c38a';
  ctx.beginPath(); ctx.arc(sx, top + 12 * k, 12 * k, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#5a4636';
  ctx.beginPath(); ctx.ellipse(sx, top + 2 * k, 21 * k, 5 * k, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  deco(ctx, 'deco_windpump', x - w * 0.42, y, k, 1);
}

function forest(ctx, x, y, k, stock) {
  const slots = [-190, -110, -35, 40, 115, 190];
  const alive = Math.round(stock * slots.length);
  slots.forEach((dx, i) => {
    const tx = x + dx * k;
    if (i < alive) deco(ctx, 'deco_tree', tx, y, k, 0.95 + ((i * 37) % 10) / 25, i % 2 === 1);
    else {
      outline(ctx, k);
      ctx.fillStyle = '#9c8466';
      ctx.beginPath(); ctx.roundRect(tx - 10 * k, y - 18 * k, 20 * k, 18 * k, 3 * k); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#d9c38a';
      ctx.beginPath(); ctx.ellipse(tx, y - 18 * k, 10 * k, 3.5 * k, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
  });
}

function mine(ctx, x, y, k, stock) {
  // Chevalement en bois, haut de 9 m
  const hx = x - 40 * k, h = 240 * k;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 10 * k;
  const legs = () => {
    ctx.beginPath();
    ctx.moveTo(hx - 60 * k, y); ctx.lineTo(hx, y - h);
    ctx.moveTo(hx + 60 * k, y); ctx.lineTo(hx, y - h);
    ctx.moveTo(hx + 60 * k, y); ctx.lineTo(hx + 120 * k, y - h * 0.5);
    ctx.moveTo(hx - 42 * k, y - h * 0.3); ctx.lineTo(hx + 42 * k, y - h * 0.3);
    ctx.moveTo(hx - 24 * k, y - h * 0.6); ctx.lineTo(hx + 24 * k, y - h * 0.6);
    ctx.stroke();
  };
  legs();
  ctx.strokeStyle = '#7a5236';
  ctx.lineWidth = 7 * k;
  legs();
  ctx.fillStyle = '#8f4426';
  outline(ctx, k);
  ctx.beginPath(); ctx.arc(hx, y - h, 26 * k, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(hx, y - h, 7 * k, 0, Math.PI * 2); ctx.stroke();
  for (let a = 0; a < 6; a++) {
    ctx.beginPath(); ctx.moveTo(hx, y - h); ctx.lineTo(hx + Math.cos(a) * 24 * k, y - h + Math.sin(a) * 24 * k); ctx.stroke();
  }
  // Terrils de charbon (leur taille suit le stock)
  [[110, 1], [210, 0.8], [-170, 0.7]].forEach(([dx, sc], i) => {
    if (stock < 0.1 + i * 0.25) return;
    const r = (45 + stock * 45) * sc * k;
    ctx.fillStyle = '#2f2b30';
    ctx.beginPath(); ctx.ellipse(x + dx * k, y, r * 1.4, r, 0, Math.PI, 0); ctx.fill(); outline(ctx, k); ctx.stroke();
    ctx.fillStyle = '#4a454c';
    ctx.beginPath(); ctx.ellipse(x + dx * k - r * 0.4, y - r * 0.55, r * 0.4, r * 0.16, -0.3, 0, Math.PI * 2); ctx.fill();
  });
}

function junkyard(ctx, x, y, k, stock) {
  // Grue de casse
  const cx = x + 150 * k, top = y - 230 * k;
  ctx.strokeStyle = INK; ctx.lineWidth = 9 * k;
  ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx, top); ctx.lineTo(cx - 170 * k, top + 30 * k); ctx.stroke();
  ctx.strokeStyle = '#E8A33D'; ctx.lineWidth = 6 * k;
  ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx, top); ctx.lineTo(cx - 170 * k, top + 30 * k); ctx.stroke();
  outline(ctx, k);
  ctx.beginPath(); ctx.moveTo(cx - 150 * k, top + 27 * k); ctx.lineTo(cx - 150 * k, top + 110 * k); ctx.stroke();
  ctx.fillStyle = '#6E6A6F';
  ctx.beginPath(); ctx.arc(cx - 150 * k, top + 118 * k, 14 * k, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // Pile d'épaves (sa hauteur suit le stock)
  const layers = Math.max(1, Math.round(stock * 3));
  deco(ctx, 'deco_car', x - 150 * k, y, k, 1.1);
  deco(ctx, 'deco_tractor', x - 20 * k, y, k, 1);
  if (layers >= 2) deco(ctx, 'deco_car', x - 120 * k, y - 38 * k, k, 1, true);
  if (layers >= 3) deco(ctx, 'deco_car', x - 140 * k, y - 76 * k, k, 0.95);
}

function ruins(ctx, x, y, k, stock) {
  if (stock > 0.2) deco(ctx, 'deco_house', x - 40 * k, y, k, 1);
  else deco(ctx, 'deco_barn', x - 40 * k, y, k, 0.8);
  deco(ctx, 'deco_rocks', x + 140 * k, y, k, 1);
  deco(ctx, 'deco_tree', x + 220 * k, y, k, 0.9, true);
}

function camp(ctx, site, x, y, k, st) {
  const color = ATTITUDE_COLORS[(st && st.attitude) || 'peaceful'];
  switch (site.camp) {
    case 'village':
      deco(ctx, 'deco_barn', x - 110 * k, y, k, 0.85);
      deco(ctx, 'deco_house', x + 70 * k, y, k, 0.8, true);
      flag(ctx, x - 10 * k, y, k, color);
      break;
    case 'nomads':
      [[-130, 1], [0, 1.25], [130, 0.95]].forEach(([dx, sc]) => {
        const tx = x + dx * k, th = 140 * k * sc;
        ctx.fillStyle = dx === 0 ? '#b5562b' : '#c9a15c';
        outline(ctx, k);
        ctx.beginPath(); ctx.moveTo(tx - th * 0.75, y); ctx.lineTo(tx, y - th); ctx.lineTo(tx + th * 0.75, y); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#3a3238';
        ctx.beginPath(); ctx.moveTo(tx - th * 0.15, y); ctx.lineTo(tx, y - th * 0.45); ctx.lineTo(tx + th * 0.15, y); ctx.closePath(); ctx.fill();
      });
      flag(ctx, x + 60 * k, y, k, color);
      break;
    case 'outpost':
      ctx.fillStyle = '#b8a27a';
      outline(ctx, k);
      for (let i = 0; i < 7; i++) {
        ctx.beginPath(); ctx.roundRect(x - 140 * k + i * 40 * k, y - 22 * k, 38 * k, 22 * k, 8 * k); ctx.fill(); ctx.stroke();
        if (i < 5) { ctx.beginPath(); ctx.roundRect(x - 120 * k + i * 40 * k, y - 42 * k, 38 * k, 22 * k, 8 * k); ctx.fill(); ctx.stroke(); }
      }
      deco(ctx, 'deco_pylon', x + 170 * k, y, k, 0.8);
      flag(ctx, x - 40 * k, y - 40 * k, k, color);
      break;
    default: { // raiders : tour de guet en ferraille
      const tx = x + 60 * k, th = 220 * k;
      ctx.strokeStyle = INK; ctx.lineWidth = 8 * k;
      ctx.beginPath(); ctx.moveTo(tx - 40 * k, y); ctx.lineTo(tx - 25 * k, y - th); ctx.moveTo(tx + 40 * k, y); ctx.lineTo(tx + 25 * k, y - th);
      ctx.moveTo(tx - 36 * k, y - th * 0.35); ctx.lineTo(tx + 36 * k, y - th * 0.6); ctx.stroke();
      ctx.strokeStyle = '#6b5446'; ctx.lineWidth = 5 * k;
      ctx.beginPath(); ctx.moveTo(tx - 40 * k, y); ctx.lineTo(tx - 25 * k, y - th); ctx.moveTo(tx + 40 * k, y); ctx.lineTo(tx + 25 * k, y - th);
      ctx.moveTo(tx - 36 * k, y - th * 0.35); ctx.lineTo(tx + 36 * k, y - th * 0.6); ctx.stroke();
      outline(ctx, k);
      ctx.fillStyle = '#5a5157';
      ctx.beginPath(); ctx.rect(tx - 45 * k, y - th - 40 * k, 90 * k, 40 * k); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#B5562B';
      ctx.beginPath(); ctx.moveTo(tx - 55 * k, y - th - 40 * k); ctx.lineTo(tx, y - th - 70 * k); ctx.lineTo(tx + 55 * k, y - th - 40 * k); ctx.closePath(); ctx.fill(); ctx.stroke();
      deco(ctx, 'deco_car', x - 140 * k, y, k, 1.05, true);
      deco(ctx, 'deco_fence', x - 20 * k, y, k, 1.6);
      flag(ctx, tx, y - th - 70 * k, k, color);
    }
  }
}

function station(ctx, x, y, k) {
  const w = 380 * k;
  deco(ctx, 'deco_tower', x - w / 2 - 70 * k, y, k, 1);
  outline(ctx, k);
  ctx.fillStyle = '#7a6a5e';
  ctx.beginPath(); ctx.rect(x - w / 2, y - 22 * k, w, 22 * k); ctx.fill(); ctx.stroke();      // quai
  ctx.fillStyle = '#8f4426';
  ctx.beginPath(); ctx.rect(x - 120 * k, y - 170 * k, 140 * k, 148 * k); ctx.fill(); ctx.stroke(); // cabane
  ctx.fillStyle = '#5a5157';
  ctx.beginPath(); ctx.moveTo(x - 135 * k, y - 170 * k); ctx.lineTo(x - 50 * k, y - 215 * k); ctx.lineTo(x + 35 * k, y - 170 * k); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#E8A33D';
  ctx.beginPath(); ctx.rect(x - 95 * k, y - 140 * k, 34 * k, 28 * k); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.rect(x - 40 * k, y - 140 * k, 34 * k, 28 * k); ctx.fill(); ctx.stroke();
  const stripes = ['#C8382D', '#EDE6D6'];
  for (let i = 0; i < 6; i++) {                                                                  // auvent rayé
    ctx.fillStyle = stripes[i % 2];
    ctx.beginPath();
    ctx.moveTo(x + 30 * k + i * 22 * k, y - 105 * k); ctx.lineTo(x + 52 * k + i * 22 * k, y - 105 * k);
    ctx.lineTo(x + 52 * k + i * 22 * k, y - 85 * k); ctx.lineTo(x + 30 * k + i * 22 * k, y - 85 * k); ctx.closePath();
    ctx.fill(); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(x + 32 * k, y - 85 * k); ctx.lineTo(x + 32 * k, y - 22 * k); ctx.moveTo(x + 160 * k, y - 85 * k); ctx.lineTo(x + 160 * k, y - 22 * k); ctx.stroke();
  [x - 170 * k, x + 185 * k].forEach(lx => {                                                     // lanternes
    ctx.beginPath(); ctx.moveTo(lx, y - 22 * k); ctx.lineTo(lx, y - 100 * k); ctx.stroke();
    ctx.fillStyle = '#F2C14E';
    ctx.beginPath(); ctx.arc(lx, y - 104 * k, 7 * k, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  });
}

function fortress(ctx, x, y, k) {
  outline(ctx, k);
  ctx.fillStyle = '#4a4247';
  ctx.beginPath(); ctx.rect(x - 220 * k, y - 170 * k, 440 * k, 170 * k); ctx.fill(); ctx.stroke();
  for (let i = 0; i < 10; i++) { ctx.beginPath(); ctx.rect(x - 220 * k + i * 46 * k, y - 192 * k, 26 * k, 22 * k); ctx.fill(); ctx.stroke(); }
  flag(ctx, x, y - 170 * k, k, '#C8382D');
}

function depot(ctx, x, y, k) {
  const w = 360 * k;
  outline(ctx, k);
  ctx.fillStyle = '#8f4426';
  ctx.beginPath(); ctx.rect(x - w / 2, y - 120 * k, w, 120 * k); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#5a5157';
  ctx.beginPath(); ctx.moveTo(x - w / 2 - 12 * k, y - 120 * k); ctx.lineTo(x, y - 165 * k); ctx.lineTo(x + w / 2 + 12 * k, y - 120 * k); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#2f2b30';
  for (let i = 0; i < 3; i++) {
    const dx = x - 120 * k + i * 120 * k;
    ctx.beginPath(); ctx.moveTo(dx - 40 * k, y); ctx.lineTo(dx - 40 * k, y - 70 * k); ctx.arc(dx, y - 70 * k, 40 * k, Math.PI, 0); ctx.lineTo(dx + 40 * k, y); ctx.closePath();
    ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = '#E8A33D';
  ctx.beginPath(); ctx.arc(x, y - 135 * k, 10 * k, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  deco(ctx, 'deco_tower', x + w / 2 + 90 * k, y, k, 0.9);
}

// Image Gemini du site, avec fondu vers la version épuisée selon le stock
function siteArt(ctx, type, x, y, k, stock) {
  const art = SITE_ART[type];
  const img = art && getImage('site_' + type);
  if (!img) return false;
  const h = art.h * k;
  const w = h * img.naturalWidth / img.naturalHeight;
  const low = art.low && getImage('site_' + type + '_low');
  const top = y - h * 0.985;
  if (low) {
    const a = Math.max(0, Math.min(1, (stock - 0.2) / 0.6));   // plein au-dessus de 80 %, épuisé sous 20 %
    if (a < 1) drawSmooth(ctx, low, x - w / 2, top, w, h);
    if (a > 0) {
      ctx.save();
      ctx.globalAlpha = a;
      drawSmooth(ctx, img, x - w / 2, top, w, h);
      ctx.restore();
    }
  } else {
    drawSmooth(ctx, img, x - w / 2, top, w, h);
  }
  return true;
}

// ---------- Drapeau des camps : 4 images, toile grise teintée selon l'attitude (teinte calculée une fois par couleur) ----------
const FLAG_FRAMES = 4, FLAG_FPS = 5;
const tinted = new Map();
function flagSheet(color) {
  if (tinted.has(color)) return tinted.get(color);
  const img = getImage('flag');
  if (!img) return null;
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  try {
    const d = g.getImageData(0, 0, c.width, c.height);
    const p = d.data;
    const tr = parseInt(color.slice(1, 3), 16) / 255, tg = parseInt(color.slice(3, 5), 16) / 255, tb = parseInt(color.slice(5, 7), 16) / 255;
    for (let i = 0; i < p.length; i += 4) {
      if (!p[i + 3]) continue;
      const mx = Math.max(p[i], p[i + 1], p[i + 2]), mn = Math.min(p[i], p[i + 1], p[i + 2]);
      if (mx - mn > 24 || mx < 70) continue;          // mât (brun) et contours : on n'y touche pas
      const l = Math.min(1, mx / 215);                 // le gris clair de la toile devient la couleur pleine
      p[i] = 255 * tr * l; p[i + 1] = 255 * tg * l; p[i + 2] = 255 * tb * l;
    }
    g.putImageData(d, 0, 0);
  } catch (e) { /* lecture des pixels refusée : drapeau gris */ }
  tinted.set(color, c);
  return c;
}

function flagArt(ctx, x, baseY, k, color, t) {
  const sheet = flagSheet(color);
  if (!sheet) return false;
  const fw = sheet.width / FLAG_FRAMES, fh = sheet.height;
  const h = CAMP_ART.flagH * k, w = h * fw / fh;
  const f = Math.floor(t * FLAG_FPS) % FLAG_FRAMES;
  ctx.drawImage(sheet, f * fw, 0, fw, fh, x - w * 0.05, baseY - h, w, h);
  return true;
}

// Camp en image : normal ou fortifié, et son drapeau
function campArt(ctx, site, x, y, k, st) {
  const A = CAMP_ART[site.camp];
  const fort = (st.defense || 0) >= CAMP_ART.fortifiedAt ? 1 : 0;
  const img = A && (getImage(`camp_${site.camp}_${fort}`) || getImage(`camp_${site.camp}_0`));
  if (!img) return false;
  const h = A.h * k, w = h * img.naturalWidth / img.naturalHeight;
  const sink = (A.sink && A.sink[getImage(`camp_${site.camp}_${fort}`) ? fort : 0]) || 0.015;
  drawSmooth(ctx, img, x - w / 2, y - h * (1 - sink), w, h);
  const color = ATTITUDE_COLORS[(st && st.attitude) || 'peaceful'];
  if (!flagArt(ctx, x + w * A.flagX, y, k, color, performance.now() / 1000)) flag(ctx, x + w * A.flagX, y, k, color);
  return true;
}

export function drawSite(ctx, state, site, x, y, k) {
  const st = state.world.sites[site.id] || {};
  const stock = st.stock ?? 1;
  if (site.type === 'camp' && campArt(ctx, site, x, y, k, st)) return;
  if (site.specialty === 'traverse' && siteArt(ctx, 'traverse', x, y, k, 1)) return;
  if (site.art && siteArt(ctx, site.art, x, y, k, stock)) return;     // image propre au lieu, quand elle existe
  if (site.type !== 'camp' && siteArt(ctx, site.type, x, y, k, stock)) return;
  switch (site.type) {
    case 'field': field(ctx, x, y, k, stock); break;
    case 'forest': forest(ctx, x, y, k, stock); break;
    case 'mine': mine(ctx, x, y, k, stock); break;
    case 'junkyard': junkyard(ctx, x, y, k, stock); break;
    case 'ruins': ruins(ctx, x, y, k, stock); break;
    case 'camp': camp(ctx, site, x, y, k, st); break;
    case 'station': station(ctx, x, y, k); break;
    case 'fortress': fortress(ctx, x, y, k); break;
    default:
  }
}

// Poteau d'aiguillage, au bord de la voie : feu vert devant (voie choisie), rouge derrière (voie fermée)
export function switchPost(ctx, x, y, k, lit) {
  const img = getImage(lit === 'red' ? 'signal_1' : lit === 'green' ? 'signal_2' : 'signal_0');
  if (img) {
    const h = CAMP_ART.signalH * k, w = h * img.naturalWidth / img.naturalHeight;
    drawSmooth(ctx, img, x - w / 2, y - h * 0.99, w, h);
    return;
  }
  outline(ctx, k);
  ctx.fillStyle = '#3a3238';
  ctx.beginPath(); ctx.rect(x - 3 * k, y - 80 * k, 6 * k, 80 * k); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#2b2a33';
  ctx.beginPath(); ctx.roundRect(x - 10 * k, y - 112 * k, 20 * k, 36 * k, 5 * k); ctx.fill(); ctx.stroke();
  ctx.fillStyle = lit ? '#F2C14E' : '#6E6A6F';
  ctx.beginPath(); ctx.arc(x, y - 102 * k, 5 * k, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8fd17e';
  ctx.beginPath(); ctx.arc(x, y - 86 * k, 5 * k, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#E8A33D';
  ctx.beginPath(); ctx.moveTo(x + 4 * k, y - 60 * k); ctx.lineTo(x + 26 * k, y - 66 * k); ctx.lineTo(x + 26 * k, y - 54 * k); ctx.closePath(); ctx.fill(); ctx.stroke();
}

// Liste des objets du trajet à placer (position le long de la voie, en unités)
export function routeObjects(state, trainMid) {
  const r = state.route;
  const out = [];
  if (r.mode === 'depot') {
    out.push({ kind: 'depot', X: r.distance + trainMid });
    return out;
  }
  const b = currentBranch(state);
  if (b) b.sites.forEach((site, k) => out.push({ kind: 'site', site, X: sitePos(state, k) + trainMid }));
  out.push({ kind: 'post', X: junctionPos(state), lit: 'green' });
  out.push({ kind: 'post', X: r.legStart, lit: 'red' });
  if (r.leg === 0) out.push({ kind: 'depot', X: r.legStart + trainMid });
  if (r.leg === r.legs - 1) out.push({ kind: 'depot', X: junctionPos(state) + trainMid });
  return out;
}

// v : { W, S, P, baseY(d), state, trainMid }
export function drawRouteObjects(ctx, v, objects) {
  const { W, S, P } = v;
  for (const o of objects) {
    const d = o.kind === 'post' ? 0.97 : SITE_DEPTH;
    const k = S * d;
    const x = W / 2 + (o.X - P) * k;
    if (x < -600 * k || x > W + 600 * k) continue;
    const y = v.baseY(d);
    if (o.kind === 'site') drawSite(ctx, v.state, o.site, x, y, k);
    else if (o.kind === 'depot') { if (!siteArt(ctx, 'depot', x, y, k, 1)) depot(ctx, x, y, k); }
    else switchPost(ctx, x, y, k, o.lit);
  }
}
