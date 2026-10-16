// Survivants dessinés à partir des planches Gemini (une base par rôle et par sexe).
// Le vêtement (vert repère) et les cheveux (bleu repère) sont recolorés une fois par survivant
// avec ses couleurs (LOOKS.outfit, LOOKS.hair), puis découpés en cadres. Sans image : pantin du code.
import { getImage } from './assets.js';
import { drawSmooth } from './mip.js';
import { CREW_SPRITES } from '../data/crewSprites.js';
import { LOOKS, isFemale } from '../data/names.js';
import { WEAPONS } from '../data/items.js';

const ROLE = { mec: 'mecano', ter: 'cultiv', com: 'guet', sav: 'savant' };
const STAND_UNITS = 50;      // hauteur debout, en unités du train (le pantin en fait 44)

// Cadence des poses à deux images (secondes par image) et petit mouvement des poses fixes
const TEMPO = { idle: 0.9, shovel: 0.5, hammer: 0.45, water: 0.12, sort: 0.7, read: 1.8, shoot: 0.12, strike: 0.26 };
// Suite d'images d'une pose (indices dans sa liste) : au repos, le soupir (2e image) ne revient qu'une fois sur quatre
const PATTERN = { idle: [0, 0, 0, 1] };
// Poses allongées : le lit est plus bas que le repère utilisé pour les pantins
const LYING = { sleep: 1, critical: 1 };

export function spriteBaseOf(s) {
  const base = ROLE[s.main] + (isFemale(s.first) ? '_f' : '_h');
  return CREW_SPRITES[base] && getImage('crew_' + base) && getImage('crew_' + base + '_m') ? base : null;
}

const cache = new Map();     // base|vêtement|cheveux -> [canvas par cadre]

function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgbHsv(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d > 0) {
    if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return [h, mx ? d / mx : 0, mx / 255];
}
function hsvRgb(h, s, v, out) {
  const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
  out[0] = (r + m) * 255; out[1] = (g + m) * 255; out[2] = (b + m) * 255;
}

function build(base, clothHex, hairHex) {
  const meta = CREW_SPRITES[base];
  const img = getImage('crew_' + base), msk = getImage('crew_' + base + '_m');
  const W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(msk, 0, 0, W, H);
  const m = g.getImageData(0, 0, W, H).data;
  g.clearRect(0, 0, W, H);
  g.drawImage(img, 0, 0);
  const id = g.getImageData(0, 0, W, H), p = id.data;
  const tgt = [[clothHex, meta.cloth, 0], [hairHex, meta.hair, 1]].map(([hex, ref, ch]) => {
    const [h, s, v] = rgbHsv(...hexRgb(hex));
    // Plafonds : les reflets de la planche ne virent pas au fluo (vert repère très saturé, couleurs éclaircies)
    return { h, ks: s / ref[0], kv: Math.min(v / ref[1], ch ? 1.2 : 1.05), ch, smax: Math.min(1, s * 1.2), vmax: Math.min(0.86, v * 1.7) };
  });
  const tmp = [0, 0, 0];
  for (let i = 0; i < p.length; i += 4) {
    if (p[i + 3] === 0) continue;
    for (const T of tgt) {
      const w = m[i + T.ch] / 255;
      if (w <= 0.02) continue;
      const [, s, v] = rgbHsv(p[i], p[i + 1], p[i + 2]);
      hsvRgb(T.h, Math.min(T.smax, s * T.ks), Math.min(T.vmax, v * T.kv), tmp);
      p[i] += (tmp[0] - p[i]) * w; p[i + 1] += (tmp[1] - p[i + 1]) * w; p[i + 2] += (tmp[2] - p[i + 2]) * w;
    }
  }
  g.putImageData(id, 0, 0);
  // Un canvas par cadre : le dessin net à toutes les tailles (mipmaps) travaille sur l'image entière
  return meta.rects.map(([x, y, w, h]) => {
    const f = document.createElement('canvas'); f.width = w; f.height = h;
    f.getContext('2d').drawImage(c, x, y, w, h, 0, 0, w, h);
    return f;
  });
}

function framesFor(s) {
  const base = spriteBaseOf(s);
  if (!base) return null;
  const cloth = LOOKS.outfit[s.look.outfit] || LOOKS.outfit[0];
  const hair = LOOKS.hair[s.look.hair] || LOOKS.hair[0];
  const key = base + cloth + hair;
  let f = cache.get(key);
  if (!f) { f = build(base, cloth, hair); cache.set(key, f); }
  return { base, meta: CREW_SPRITES[base], frames: f };
}

// Dessin d'un survivant : (x, y) = entre les pieds. Renvoie false si pas d'image (le pantin prend le relais).
// gear : { weapon } ; au poste de tir sans arme à distance, pas de fusil dans les mains.
export function drawCrewSprite(ctx, s, x, y, scale, pose, t, flip = false, gear = null) {
  const F = framesFor(s);
  if (!F) return false;
  const { meta, frames } = F;
  if (pose === 'aim' && !(gear && WEAPONS[gear.weapon] && WEAPONS[gear.weapon].range > 0)) pose = 'watch';   // jumelles (ou repos)
  const p = meta.poses[pose] ? pose : 'idle';     // « stand » et poses sans image : repos
  const list = meta.poses[p];
  const ph = (parseInt(s.id.slice(1), 10) || 0) * 0.37;    // déphasage propre à chacun
  const step = Math.floor((t + ph) / (TEMPO[p] || 0.8));
  const pat = PATTERN[p];
  const idx = list[pat ? pat[step % pat.length] % list.length : step % list.length];
  const [, , w, h, ax, ay] = meta.rects[idx];
  const k = STAND_UNITS * scale / meta.standH;
  // Respiration : la même pour tout le monde, à tous les postes (le corps se gonfle à peine, pieds fixes)
  const breath = 1 + Math.sin((t + ph) * 2.1) * (LYING[p] ? 0.03 : 0.012);
  ctx.save();
  ctx.translate(x, y + (LYING[p] ? 5.5 * scale : 0));
  if (flip) ctx.scale(-1, 1);
  ctx.scale(1, breath);
  drawSmooth(ctx, frames[idx], -ax * k, -ay * k, w * k, h * k);
  ctx.restore();
  return true;
}

// Portrait (fiches, barre d'équipage) : la tête du premier cadre de repos, dans un carré de côté size
export function drawCrewPortrait(ctx, s, size) {
  const F = framesFor(s);
  if (!F) return false;
  const [cx, top, side] = F.meta.head;
  const f = F.frames[F.meta.poses.idle[0]];
  ctx.drawImage(f, cx - side / 2, top, side, side, 0, size * 0.06, size, size);
  return true;
}
