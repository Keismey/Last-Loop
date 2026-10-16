// Paysage en profondeur à partir des images Gemini (GDD §14.3, §15.4).
// Ciel, collines, éléments dispersés et sol, chacun à sa profondeur : défilement, taille et zoom cohérents
// avec le train. Renvoie false si les images de l'anneau manquent (le décor dessiné par le code prend le relais).
import { getImage } from './assets.js';
import { drawSmooth } from './mip.js';
import { LANDSCAPE } from '../data/landscape.js';

// Couleur moyenne d'une ligne de l'image (pour prolonger le ciel et le sol au-delà des bandes)
const colorCache = new Map();
function rowColor(img, fracY) {
  const key = img.src + '|' + fracY;
  if (colorCache.has(key)) return colorCache.get(key);
  let color = '#888';
  try {
    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 1;
    const g = c.getContext('2d');
    const y = Math.min(img.naturalHeight - 2, Math.max(0, Math.round(fracY * img.naturalHeight)));
    g.drawImage(img, 0, y, img.naturalWidth, 2, 0, 0, 32, 1);
    const d = g.getImageData(0, 0, 32, 1).data;
    let r = 0, gg = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
    color = `rgb(${Math.round(r / 32)},${Math.round(gg / 32)},${Math.round(b / 32)})`;
  } catch (e) { /* lecture impossible : couleur neutre */ }
  colorCache.set(key, color);
  return color;
}

// ---------- Ciel ----------
// Bande d'horizon prête à l'emploi : bas de l'image, haut fondu en transparence (calculée une fois)
const stripCache = new Map();
function horizonStrip(img, cfg) {
  if (stripCache.has(img.src)) return stripCache.get(img.src);
  const y0 = Math.round(cfg.cropTop * img.naturalHeight);
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight - y0;
  const g = c.getContext('2d');
  g.drawImage(img, 0, y0, c.width, c.height, 0, 0, c.width, c.height);
  const fade = Math.round(cfg.fade * img.naturalHeight);
  // destination-out n'efface que sous la forme dessinée (destination-in effacerait tout le reste)
  const grad = g.createLinearGradient(0, 0, 0, fade);
  grad.addColorStop(0, 'rgba(0,0,0,1)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = grad;
  g.fillRect(0, 0, c.width, fade);
  stripCache.set(img.src, c);
  return c;
}

// Nuage dessiné par le code, dans le style des images (aplat, ombre en bas, contour sombre)
const cloudCache = new Map();
function cloudShape(seed, colors) {
  if (cloudCache.has(seed)) return cloudCache.get(seed);
  // Forme des nuages Gemini : longue traînée effilée aux deux bouts, quelques bosses arrondies sur le dessus,
  // dessous presque plat, bande d'ombre en bas, contour fin et sombre.
  const rand = cellRand(seed, 99, 7);
  const w = 720, h = Math.round(w * (0.12 + rand() * 0.08));
  const pad = 6;
  const c = document.createElement('canvas');
  c.width = w + pad * 2;
  c.height = h + pad * 2;
  const g = c.getContext('2d');
  g.translate(pad, pad);
  const base = h * 0.9;
  const humps = [];
  const n = 1 + Math.floor(rand() * 3);
  const peak = 0.3 + rand() * 0.4;                        // bosse principale, pas forcément au centre
  for (let i = 0; i < n; i++) {
    const cx = Math.min(0.8, Math.max(0.2, peak + (i ? (rand() - 0.5) * 0.45 : 0)));
    humps.push({ c: cx, r: 0.08 + rand() * 0.1, hgt: (i ? 0.45 + rand() * 0.3 : 0.75 + rand() * 0.2) });
  }
  const top = t => {
    let y = 0.24 * Math.pow(Math.sin(Math.PI * t), 0.7);  // traînée effilée
    for (const k of humps) {
      const u = (t - k.c) / k.r;
      if (u > -1 && u < 1) y = Math.max(y, k.hgt * Math.sqrt(1 - u * u) * Math.pow(Math.sin(Math.PI * t), 0.3));
    }
    return base - y * base;
  };
  const bottom = t => base + h * 0.07 * Math.sin(Math.PI * t);
  const N = 90;
  const outlinePath = () => {
    g.beginPath();
    for (let i = 0; i <= N; i++) { const t = i / N; g.lineTo(t * w, top(t)); }
    for (let i = N; i >= 0; i--) { const t = i / N; g.lineTo(t * w, Math.min(h, bottom(t))); }
    g.closePath();
  };
  g.lineJoin = 'round';
  outlinePath();
  g.fillStyle = colors.fill;
  g.fill();
  // Ombre : bande basse, sous une ligne qui suit vaguement le dessus
  const shade = t => base - (base - top(t)) * 0.3 - h * 0.03 * Math.sin(Math.PI * t);
  g.save();
  outlinePath();
  g.clip();
  g.beginPath();
  for (let i = 0; i <= N; i++) { const t = i / N; g.lineTo(t * w, shade(t)); }
  g.lineTo(w, h); g.lineTo(0, h); g.closePath();
  g.fillStyle = colors.shade;
  g.fill();
  g.beginPath();
  for (let i = 4; i <= N - 4; i++) { const t = i / N; g.lineTo(t * w, shade(t)); }
  g.strokeStyle = colors.outline;
  g.globalAlpha = 0.55;
  g.lineWidth = 2;
  g.stroke();
  g.restore();
  outlinePath();
  g.strokeStyle = colors.outline;
  g.lineWidth = 3;
  g.stroke();
  cloudCache.set(seed, c);
  return c;
}

function drawSky(ctx, L, W, horizonY, skyUnit, scrollPx, time) {
  const grad = ctx.createLinearGradient(0, horizonY - skyUnit * 1.4, 0, horizonY);
  grad.addColorStop(0, L.sky.top);
  grad.addColorStop(1, L.sky.horizon);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, Math.ceil(horizonY) + 2);

  const sun = L.sun;
  if (sun) {
    const x = sun.x * W, y = horizonY - sun.height * skyUnit, r = sun.r * skyUnit;
    const glow = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 4.5);
    glow.addColorStop(0, sun.glow + '0.55)');
    glow.addColorStop(1, sun.glow + '0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - r * 4.5, y - r * 4.5, r * 9, r * 9);
    ctx.fillStyle = sun.color;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  const cl = L.clouds;
  if (!cl) return;
  const period = cl.period * W;
  const drift = time * cl.wind + scrollPx * cl.parallax;
  for (let i = 0; i < cl.count; i++) {
    const rand = cellRand(i, 42, 1);
    const img = cloudShape(i, cl);
    const cw = skyUnit * (1.4 + rand() * 1.8);
    const ch = cw * (img.height / img.width);
    const y = horizonY - skyUnit * (0.3 + rand() * 1.1) - ch * 0.5;
    let x = (rand() * period - drift) % period;
    if (x < 0) x += period;
    x -= cw;                                       // apparaît par la droite, sort par la gauche
    if (x > W || x + cw < 0) continue;
    if (rand() < 0.5) {
      ctx.save(); ctx.translate(x + cw, 0); ctx.scale(-1, 1);
      drawSmooth(ctx, img, 0, y, cw, ch);
      ctx.restore();
    } else {
      drawSmooth(ctx, img, x, y, cw, ch);
    }
  }
}

// Bande répétée en miroir (normale, retournée, normale…) : aucun raccord visible
function tile(ctx, img, top, h, offset, W) {
  const tw = (h * img.naturalWidth) / img.naturalHeight;
  if (tw < 1) return;
  const period = tw * 2;
  const o = ((offset % period) + period) % period;
  let x = -o;
  let i = 0;
  while (x < W) {
    if (x + tw > 0) {
      if (i % 2 === 1) {
        ctx.save();
        ctx.translate(x + tw, 0);
        ctx.scale(-1, 1);
        drawSmooth(ctx, img, 0, top, tw, h);
        ctx.restore();
      } else {
        drawSmooth(ctx, img, x, top, tw, h);
      }
    }
    x += tw;
    i += 1;
  }
}

// Petit générateur pseudo-aléatoire déterministe pour une case donnée
function cellRand(k, row, ring) {
  let s = (Math.imul(k, 374761393) + Math.imul(row + 1, 668265263) + Math.imul(ring, 1442695041)) | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let x = Math.imul(s ^ (s >>> 15), 1 | s);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

// Contenu d'un paquet de cases : le paquet est mélangé (graine = numéro du paquet) jusqu'à ce qu'aucun élément
// ne revienne à moins de `gap` cases. Chaque paquet ne dépend que de son numéro : toujours identique.
const deckCache = new Map();
function deckFor(row, rowIndex, ring, block) {
  const key = ring + ':' + rowIndex + ':' + block;
  if (deckCache.has(key)) return deckCache.get(key);
  const rand = cellRand(block, rowIndex + 10, ring);
  const n = row.deck.length;
  let best = null, bestBad = Infinity;
  for (let attempt = 0; attempt < 40 && bestBad > 0; attempt++) {
    const d = row.deck.slice();
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [d[i], d[j]] = [d[j], d[i]];
    }
    let bad = 0;
    for (let i = 0; i < n; i++) {
      if (!d[i]) continue;
      for (let k = 1; k <= row.gap && i - k >= 0; k++) if (d[i - k] === d[i]) bad++;
    }
    if (bad < bestBad) { best = d; bestBad = bad; }
  }
  if (deckCache.size > 400) deckCache.clear();
  deckCache.set(key, best);
  return best;
}

// Élément de la case k ; à la jonction de deux paquets, un élément déjà présent juste avant est retiré
function cellItem(row, rowIndex, ring, k) {
  const n = row.deck.length;
  const block = Math.floor(k / n);
  const i = k - block * n;
  const id = deckFor(row, rowIndex, ring, block)[i];
  if (!id || i >= row.gap) return id;
  const prev = deckFor(row, rowIndex, ring, block - 1);
  for (let j = n - (row.gap - i); j < n; j++) if (prev[j] === id) return null;
  return id;
}

// Rassemble les éléments visibles d'une rangée (chacun avec sa profondeur)
function collectRow(out, row, rowIndex, v) {
  const { W, S, P, ring } = v;
  const [dMin, dMax] = row.depth;
  const reach = (W / 2) / (S * dMin) + 300;
  const k0 = Math.floor((P - reach) / row.cell);
  const k1 = Math.ceil((P + reach) / row.cell);
  for (let k = k0; k <= k1; k++) {
    const id = cellItem(row, rowIndex, ring, k);
    if (!id) continue;
    const rand = cellRand(k, rowIndex, ring);
    const X = k * row.cell + rand() * row.cell * 0.7;
    // Pas d'élément de décor sur un site du trajet (gare, mine…)
    if (v.clear && v.clear.some(c => Math.abs(c - X) < 480)) continue;
    out.push({
      id,
      X,
      d: dMin + rand() * (dMax - dMin),
      size: 0.85 + rand() * 0.3,
      flip: rand() < 0.5
    });
  }
}

function drawItems(ctx, items, v, baseY) {
  const { W, S, P } = v;
  items.sort((a, b) => a.d - b.d);                // du plus loin au plus proche
  for (const it of items) {
    const img = getImage(it.id);
    if (!img) continue;
    const sd = S * it.d;
    const h = LANDSCAPE.decoHeights[it.id] * sd * it.size;
    const w = h * (img.naturalWidth / img.naturalHeight);
    const sx = W / 2 + (it.X - P) * sd;
    if (sx + w < 0 || sx - w > W) continue;
    const y = baseY(it.d) - h * 0.98;
    if (it.flip) {
      ctx.save();
      ctx.translate(sx, 0);
      ctx.scale(-1, 1);
      drawSmooth(ctx, img, -w / 2, y, w, h);
      ctx.restore();
    } else {
      drawSmooth(ctx, img, sx - w / 2, y, w, h);
    }
  }
}

function drawRows(ctx, L, v, baseY, front) {
  const items = [];
  L.rows.forEach((row, i) => { if (!!row.front === front) collectRow(items, row, i, v); });
  drawItems(ctx, items, v, baseY);
}

// v : { W, H, S, z, P, railY, ring } — P = position de la caméra le long de la voie (unités)
export function drawLandscape(ctx, v) {
  const L = LANDSCAPE.rings[v.ring];
  if (!L) return false;
  const far = getImage(L.far.id), hills = getImage(L.hills.id), ground = getImage(L.ground.id);
  if (!far || !hills || !ground) return false;
  const { W, H, S, z, P, railY } = v;
  const yh1 = LANDSCAPE.horizon * H;
  const baseY = d => railY - (railY - yh1) * (1 - d) * z;   // ligne de sol à la profondeur d
  const horizonY = baseY(0);

  // Fond complet d'abord : aucune trace de l'image précédente ne peut subsister
  ctx.fillStyle = rowColor(ground, 0.99);
  ctx.fillRect(0, 0, W, H);
  const fz = Math.sqrt(z);
  const skyUnit = yh1 * fz;                       // hauteur de ciel de référence
  drawSky(ctx, L, W, horizonY, skyUnit, P * S, v.time || 0);

  // Bande d'horizon : une seule image à la largeur de l'écran, horizon calé
  const strip = horizonStrip(far, L.far);
  const k = W / far.naturalWidth;
  const stop = horizonY - (L.far.horizonFrac - L.far.cropTop) * far.naturalHeight * k;
  const sh = strip.height * k;
  ctx.fillStyle = rowColor(far, 0.99);
  ctx.fillRect(0, Math.floor(stop + sh) - 1, W, H);
  drawSmooth(ctx, strip, 0, stop, W, sh);

  // Collines
  const hd = L.hills.depth;
  const hh = L.hills.height * S * hd;
  tile(ctx, hills, baseY(hd) - L.hills.baseFrac * hh, hh, P * S * hd, W);

  // Éléments lointains, du plus loin au plus proche
  drawRows(ctx, L, v, baseY, false);

  // Sol proche
  const gh = L.ground.height * S;
  const gtop = baseY(L.ground.topDepth) - L.ground.topFrac * gh;
  ctx.fillStyle = rowColor(ground, 0.99);
  ctx.fillRect(0, Math.floor(gtop + gh) - 1, W, H);
  tile(ctx, ground, gtop, gh, P * S, W);

  // Sites du trajet (arrêts, dépôt, poteaux d'aiguillage)
  if (v.drawObjects) v.drawObjects(baseY);

  // Éléments proches (clôtures), posés sur le sol
  drawRows(ctx, L, v, baseY, true);
  return true;
}
