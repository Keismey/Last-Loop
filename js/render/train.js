// Le convoi : locomotive, wagons en coupe, bogies, attelages, rails et fumée (GDD §14.3).
// Les images Gemini sont utilisées dès qu'elles existent ; sinon le code dessine un remplaçant.
import { getImage } from './assets.js';
import { SPRITES, PLACEHOLDER_WAGON, PLACEHOLDER_LOCO, CABOOSE_META } from '../data/sprites.js';
import { BUILD } from '../data/build.js';
import { WAGONS } from '../data/wagons.js';
import { t } from '../core/i18n.js';
import { drawSmooth } from './mip.js';

const INK = '#2B2A33';
const GAP = 14;          // espace entre deux voitures (attelage)
const BOGIE_H = 18;      // hauteur entre le rail et le bas d'un wagon
const COUPLER_H = 21.7;  // hauteur des tampons, alignée sur l'arrière de la locomotive
const WHEEL_R = 9;
const CABOOSE_GAP = 5;  // le fourgon est boulonné au dernier wagon

// ---------- Disposition du convoi (unités du train : 0 = avant de la loco, vers la gauche en négatif) ----------
export function trainLayout(state) {
  const cars = [];
  // Locomotive : tant que l'image du palier n'existe pas, on garde celle de La Braise
  let locoId = 'loco_t' + state.train.loco;
  if (!getImage(locoId) && getImage('loco_t1')) locoId = 'loco_t1';
  const lm = SPRITES[locoId] && getImage(locoId) ? SPRITES[locoId] : PLACEHOLDER_LOCO;
  let x = 0;
  cars.push({ kind: 'loco', id: locoId, x0: x - lm.w, x1: x, meta: lm, image: getImage(locoId) });
  x -= lm.w + GAP;
  state.train.wagons.forEach((w, i) => {
    const key = 'wagon_' + w.type;
    let img = getImage(key);
    const m = img && SPRITES[key] ? SPRITES[key] : PLACEHOLDER_WAGON;
    // Tourelle orientable : wagon au toit nu, la tête est posée et tournée par le code
    const head = m.head && getImage(m.head.set + '_0') && getImage(key + '_bare') ? m.head : null;
    if (head) img = getImage(key + '_bare');
    cars.push({ kind: 'wagon', index: i, wagon: w, id: key, x0: x - m.w, x1: x, meta: m, image: img, head });
    x -= m.w + GAP;
  });
  // Fourgon de queue blindé : collé derrière le dernier wagon (position n pour le combat)
  const cb = state.train.caboose;
  if (cb) {
    const img = getImage('wagon_caboose');
    const m = img && SPRITES.wagon_caboose ? SPRITES.wagon_caboose : CABOOSE_META;
    x += GAP - CABOOSE_GAP;
    cars.push({ kind: 'wagon', index: state.train.wagons.length, wagon: cb, id: 'wagon_caboose', x0: x - m.w, x1: x, meta: m, image: img });
  }
  return cars;
}

// ---------- Rails ----------
export function drawRails(ctx, w, railY, S, offset) {
  ctx.fillStyle = '#4b4248';
  ctx.fillRect(0, railY + 2 * S, w, 7 * S);
  const gap = 26 * S;
  const o = ((offset % gap) + gap) % gap;
  ctx.fillStyle = '#5a3f33';
  for (let x = -o; x < w; x += gap) ctx.fillRect(x, railY + 1 * S, 14 * S, 5 * S);
  ctx.fillStyle = '#9a9094';
  ctx.fillRect(0, railY - 2 * S, w, 3 * S);
  ctx.fillStyle = '#c9c0c2';
  ctx.fillRect(0, railY - 2 * S, w, Math.max(1, S));
}

// ---------- Roues et bogies (dessinés par le code, assortis aux images) ----------
function spokedWheel(ctx, x, y, r, angle) {
  ctx.fillStyle = '#3a3238';
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.16); ctx.strokeStyle = INK; ctx.stroke();
  ctx.fillStyle = '#8f4426';
  ctx.beginPath(); ctx.arc(x, y, r * 0.72, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#5a2f1c';
  ctx.lineWidth = Math.max(1, r * 0.12);
  for (let k = 0; k < 6; k++) {
    const a = angle + (k * Math.PI) / 3;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r * 0.72, y + Math.sin(a) * r * 0.72); ctx.stroke();
  }
  ctx.fillStyle = '#c9c0b4';
  ctx.beginPath(); ctx.arc(x, y, r * 0.2, 0, Math.PI * 2); ctx.fill();
}

function bogie(ctx, cx, railY, S, angle) {
  const r = WHEEL_R * S, d = 13 * S;
  spokedWheel(ctx, cx - d, railY - r, r, angle);
  spokedWheel(ctx, cx + d, railY - r, r, angle);
  ctx.fillStyle = '#3d3539';
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, 1.6 * S);
  ctx.beginPath();
  ctx.roundRect(cx - d - 6 * S, railY - r - 6 * S, 2 * d + 12 * S, 8 * S, 3 * S);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#B5562B';
  ctx.fillRect(cx - 3 * S, railY - r - 4 * S, 6 * S, 4 * S);
}

// ---------- Grenier (GDD §4.7) : caisses bâchées et filet sur le toit ----------
function drawAttic(ctx, x, top, w, S) {
  const x0 = x + w * 0.08, x1 = x + w * 0.42, base = top + 3 * S;
  ctx.save();
  ctx.lineWidth = Math.max(1, 1.3 * S);
  ctx.strokeStyle = INK;
  // caisses
  [[0, 12, 0.45], [0.42, 16, 0.35], [0.75, 10, 0.25]].forEach(([f, h, wf]) => {
    const bx = x0 + (x1 - x0) * f, bw = (x1 - x0) * wf;
    ctx.fillStyle = '#8a6a44';
    ctx.beginPath(); ctx.rect(bx, base - h * S, bw, h * S); ctx.fill(); ctx.stroke();
  });
  // bâche
  ctx.fillStyle = '#5f6b4e';
  ctx.beginPath();
  ctx.moveTo(x0 - 2 * S, base);
  ctx.quadraticCurveTo(x0 + (x1 - x0) * 0.3, base - 21 * S, x0 + (x1 - x0) * 0.62, base - 17 * S);
  ctx.lineTo(x0 + (x1 - x0) * 0.62, base);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // cordes
  ctx.strokeStyle = 'rgba(237,230,214,0.6)';
  ctx.lineWidth = Math.max(0.8, 0.9 * S);
  for (let i = 1; i < 4; i++) {
    const px = x0 + (x1 - x0) * i * 0.2;
    ctx.beginPath(); ctx.moveTo(px, base - 1); ctx.lineTo(px + 4 * S, base - 15 * S); ctx.stroke();
  }
  ctx.restore();
}

// Couchettes sur le toit : plateforme, montants, bâche ; les dormeurs sont dessinés avec l'équipage
export const BERTHS = { x0: 0.07, x1: 0.47, sleepers: [0.17, 0.36], mattress: 5 };
function drawBerths(ctx, x, top, w, S) {
  const x0 = x + w * BERTHS.x0, x1 = x + w * BERTHS.x1, base = top + 2 * S;
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, 1.3 * S);
  // toile tendue au fond
  ctx.fillStyle = 'rgba(111, 92, 70, 0.9)';
  ctx.beginPath(); ctx.rect(x0 + 2 * S, base - 22 * S, x1 - x0 - 4 * S, 20 * S); ctx.fill();
  // montants
  ctx.fillStyle = '#6b4a3a';
  for (const px of [x0, (x0 + x1) / 2, x1 - 3 * S]) { ctx.beginPath(); ctx.rect(px, base - 25 * S, 3 * S, 25 * S); ctx.fill(); ctx.stroke(); }
  // matelas
  ctx.fillStyle = '#c9a15c';
  ctx.beginPath(); ctx.roundRect(x0 + 3 * S, base - BERTHS.mattress * S, x1 - x0 - 6 * S, 4 * S, 2 * S); ctx.fill(); ctx.stroke();
  // plancher
  ctx.fillStyle = '#5a3f33';
  ctx.beginPath(); ctx.rect(x0 - 2 * S, base - 1.5 * S, x1 - x0 + 4 * S, 3 * S); ctx.fill(); ctx.stroke();
  // bâche en auvent
  ctx.fillStyle = '#3E8E8A';
  ctx.beginPath();
  ctx.moveTo(x0 - 4 * S, base - 22 * S);
  ctx.lineTo(x0 + 6 * S, base - 30 * S);
  ctx.lineTo(x1 - 2 * S, base - 30 * S);
  ctx.lineTo(x1 + 4 * S, base - 22 * S);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(237,230,214,0.45)';
  for (let i = 1; i < 5; i++) { const px = x0 + (x1 - x0) * i / 5; ctx.beginPath(); ctx.moveTo(px, base - 29 * S); ctx.lineTo(px - 2 * S, base - 23 * S); ctx.stroke(); }
  ctx.restore();
}

// Tourelle auto sur le toit (provisoire, avant l'image Gemini) : socle, tête blindée, double canon, œil rouge
function drawRoofTurret(ctx, x, top, w, S, t) {
  const cx = x + w * 0.5, base = top + 2 * S;
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, 1.3 * S);
  ctx.fillStyle = '#5a5157';
  ctx.beginPath(); ctx.rect(cx - 22 * S, base - 6 * S, 44 * S, 6 * S); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#7b4a36';
  ctx.beginPath(); ctx.roundRect(cx - 16 * S, base - 20 * S, 30 * S, 14 * S, 5 * S); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#3a3238';
  ctx.beginPath(); ctx.rect(cx + 14 * S, base - 17 * S, 22 * S, 3 * S); ctx.rect(cx + 14 * S, base - 12 * S, 22 * S, 3 * S); ctx.fill(); ctx.stroke();
  const blink = 0.6 + 0.4 * Math.sin((t || 0) * 4);
  ctx.fillStyle = `rgba(255, 70, 50, ${blink})`;
  ctx.beginPath(); ctx.arc(cx + 8 * S, base - 14 * S, 2.6 * S, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#6E6A6F';
  ctx.beginPath(); ctx.moveTo(cx - 12 * S, base - 20 * S); ctx.lineTo(cx - 16 * S, base - 28 * S); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx - 17 * S, base - 29 * S, 3 * S, Math.PI * 0.9, Math.PI * 1.9); ctx.stroke();
  ctx.restore();
}

// Image d'extension de toit du wagon (null si aucune, ou si l'image ou la ligne de toit manque)
export function roofArt(car) {
  const wg = car.wagon, m = car.meta;
  const id = wg.attic ? 'roof_attic' : wg.berths ? 'roof_berths' : wg.roofTurret ? 'roof_autoturret' : null;
  if (!id || !m || m.roof == null) return null;
  const img = getImage(id);
  return img ? { id, img, meta: SPRITES[id] } : null;
}

// Position de la tête de tourelle d'un wagon à l'écran (null s'il n'y en a pas)
function headPlace(car, x, top, w, S) {
  if (car.head) return { set: car.head.set, x: x + car.head.x * w, y: top + car.head.y * S, h: car.head.h * S };
  const r = roofArt(car);
  if (r && r.meta.head && getImage(r.meta.head.set + '_0')) {
    const H = r.meta.head;
    return { set: H.set, x: x + H.x * w, y: top + car.meta.roof * S + H.y * S, h: H.h * S };
  }
  return null;
}

// aim : −2 (loin à gauche) … 0 (en face) … +2 (loin à droite) ; sans cible, regarde vers l'avant
const HEAD_VIEW = { 0: 1, 1: 2, 2: 0 };      // |aim| → image : face, trois quarts, profil
function drawHead(ctx, p, aim) {
  const a = aim === undefined || aim === null ? 2 : aim;
  const v = HEAD_VIEW[Math.min(2, Math.abs(a))];
  const img = getImage(p.set + '_' + v);
  if (!img) return;
  const h = p.h, w = h * img.naturalWidth / img.naturalHeight;
  const cx = SPRITES[p.set].cx[v] * w;
  ctx.save();
  ctx.translate(p.x, p.y);
  if (a < 0) ctx.scale(-1, 1);
  drawSmooth(ctx, img, -cx, -h, w, h);
  ctx.restore();
}

// Bouche des canons d'une tourelle (pour les traits de tir), ou null
export function muzzlePoint(car, view) {
  const f = carFrame(car, view);
  const p = headPlace(car, f.x, f.top, f.w, view.S);
  if (!p) return null;
  const a = car.wagon.aim ?? 2;
  const side = a < 0 ? -1 : 1;
  const reach = Math.abs(a) === 2 ? 1.2 : Math.abs(a) === 1 ? 0.7 : 0;
  return { x: p.x + side * reach * p.h, y: p.y - p.h * 0.6 };
}

// Couchettes du toit : où coucher les dormeurs (écran) ; f : cadre du wagon (carFrame)
export function berthSpots(car, f, S) {
  const r = roofArt(car);
  if (r && r.id === 'roof_berths') {
    const y = f.top + car.meta.roof * S - r.meta.mattress * S;
    return r.meta.sleepers.map(fx => ({ x: f.x + fx * f.w, y }));
  }
  return BERTHS.sleepers.map(fx => ({ x: f.x + fx * f.w, y: f.top + 2 * S - BERTHS.mattress * S }));
}

// Niveau du wagon : chevrons dorés en bas à gauche
function levelMarks(ctx, x, bottom, S, level) {
  ctx.save();
  ctx.fillStyle = '#F2C14E';
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(0.8, S);
  for (let i = 0; i < level - 1; i++) {
    const cx = x + 10 * S + i * 8 * S, cy = bottom - 8 * S;
    ctx.beginPath(); ctx.moveTo(cx - 3 * S, cy + 2 * S); ctx.lineTo(cx, cy - 2 * S); ctx.lineTo(cx + 3 * S, cy + 2 * S);
    ctx.lineTo(cx + 3 * S, cy + 4 * S); ctx.lineTo(cx, cy); ctx.lineTo(cx - 3 * S, cy + 4 * S); ctx.closePath();
    ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

// ---------- Wagon provisoire (avant l'image Gemini) ----------
function placeholderWagon(ctx, x, top, w, h, type) {
  const color = (WAGONS[type] && WAGONS[type].color) || '#6E6A6F';
  ctx.fillStyle = color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(x, top, w, h, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#2f2c34';
  ctx.fillRect(x + w * 0.08, top + h * 0.18, w * 0.84, h * 0.66);
  ctx.fillStyle = '#EDE6D6';
  ctx.font = `600 ${Math.max(9, h * 0.13)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(t('wagon.' + type), x + w / 2, top + h * 0.5);
}

// ---------- Fourgon de queue blindé (dessin du code, en attendant l'image Gemini) ----------
// Coordonnées en unités du train (118 × 100) : à gauche la porte blindée et l'éperon, à droite la coupe
// intérieure (poste de garde) ; une vigie sur le toit. Porte enfoncée : battant arraché, lueur de feu.
function rivets(ctx, x0, y0, x1, y1, step) {
  ctx.fillStyle = 'rgba(43,42,51,0.55)';
  for (let x = x0; x <= x1; x += step) for (const y of [y0, y1]) { ctx.beginPath(); ctx.arc(x, y, 0.9, 0, Math.PI * 2); ctx.fill(); }
}
function drawCaboose(ctx, x, top, S, cb, distance) {
  const breached = cb.breached;
  ctx.save();
  ctx.translate(x, top);
  ctx.scale(S, S);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  // Vigie sur le toit
  ctx.lineWidth = 2;
  ctx.fillStyle = '#6a4c40';
  ctx.beginPath(); ctx.roundRect(58, -15, 36, 19, [5, 5, 0, 0]); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#e8b55a';
  ctx.beginPath(); ctx.rect(64, -10, 24, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#4b3a36';
  ctx.beginPath(); ctx.roundRect(54, -19, 44, 5, 2); ctx.fill(); ctx.stroke();
  // Caisse
  ctx.fillStyle = '#7b5546';
  ctx.beginPath(); ctx.roundRect(0, 2, 118, 92, [10, 8, 4, 4]); ctx.fill(); ctx.stroke();
  // Intérieur en coupe (poste de garde)
  const g = ctx.createLinearGradient(40, 10, 40, 90);
  g.addColorStop(0, '#3a2f33'); g.addColorStop(1, '#2a2328');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.rect(38, 12, 72, 78); ctx.fill(); ctx.stroke();
  // halo de la lanterne
  const lg = ctx.createRadialGradient(76, 22, 2, 76, 30, 40);
  lg.addColorStop(0, 'rgba(242,193,78,0.45)'); lg.addColorStop(1, 'rgba(242,193,78,0)');
  ctx.fillStyle = lg;
  ctx.fillRect(38, 12, 72, 78);
  // plaques du fond
  ctx.strokeStyle = 'rgba(237,230,214,0.12)';
  ctx.lineWidth = 1;
  for (const px of [56, 74, 92]) { ctx.beginPath(); ctx.moveTo(px, 12); ctx.lineTo(px, 90); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(38, 50); ctx.lineTo(110, 50); ctx.stroke();
  // meurtrière vers l'arrière, lanterne
  ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
  ctx.fillStyle = breached ? '#e0702e' : '#d9a85a';
  ctx.beginPath(); ctx.rect(42, 34, 10, 4); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(76, 12); ctx.lineTo(76, 18); ctx.stroke();
  ctx.fillStyle = '#F2C14E';
  ctx.beginPath(); ctx.roundRect(73, 18, 6, 8, 1.5); ctx.fill(); ctx.stroke();
  // sacs de sable contre la cloison arrière, caisse de munitions
  ctx.fillStyle = '#a58a62';
  [[41, 80], [50, 80], [45.5, 73]].forEach(([sx, sy]) => { ctx.beginPath(); ctx.roundRect(sx, sy, 10, 8, 3); ctx.fill(); ctx.stroke(); });
  ctx.fillStyle = '#5f6b4e';
  ctx.beginPath(); ctx.rect(96, 78, 12, 10); ctx.fill(); ctx.stroke();
  // plancher
  ctx.fillStyle = '#4a3a36';
  ctx.beginPath(); ctx.rect(36, 88, 76, 4); ctx.fill(); ctx.stroke();
  // Cloison avant (côté wagon)
  ctx.fillStyle = '#6a4a3e';
  ctx.beginPath(); ctx.rect(110, 8, 6, 84); ctx.fill(); ctx.stroke();
  // Arrière blindé : plaques rivetées
  ctx.fillStyle = '#8a6250';
  ctx.beginPath(); ctx.roundRect(2, 4, 36, 88, [9, 0, 0, 3]); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#6f7a6a';
  ctx.beginPath(); ctx.rect(4, 8, 12, 22); ctx.fill(); ctx.stroke();
  // rouille et peinture écaillée (comme les wagons Gemini)
  ctx.save();
  ctx.lineWidth = 0;
  [[18, 12, 9, 5, '#a8643a'], [5, 48, 6, 9, '#a8643a'], [26, 70, 7, 4, '#c9b79a'], [70, 3.5, 14, 3, '#a8643a'],
    [96, 4, 8, 2.5, '#c9b79a'], [111, 60, 3, 10, '#a8643a']].forEach(([rx, ry, rw, rh, col]) => {
    ctx.fillStyle = col; ctx.globalAlpha = 0.8;
    ctx.beginPath(); ctx.ellipse(rx + rw / 2, ry + rh / 2, rw / 2, rh / 2, 0.2, 0, Math.PI * 2); ctx.fill();
  });
  ctx.restore();
  ctx.strokeStyle = INK; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(2, 31); ctx.lineTo(38, 31); ctx.moveTo(2, 64); ctx.lineTo(38, 64); ctx.stroke();
  rivets(ctx, 6, 10, 36, 28, 5);
  rivets(ctx, 6, 66, 36, 90, 5);
  // Porte (la « porte d'entrée » du train)
  if (!breached) {
    ctx.fillStyle = '#5a4a48';
    ctx.beginPath(); ctx.roundRect(10, 32, 22, 56, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#7d6a60';
    for (const by of [42, 60, 78]) { ctx.beginPath(); ctx.rect(8, by, 26, 4); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = '#d9a85a';
    ctx.beginPath(); ctx.arc(28, 60, 1.6, 0, Math.PI * 2); ctx.fill();
  } else {
    // ouverture béante, battant arraché qui pend
    const fire = ctx.createLinearGradient(10, 32, 10, 88);
    fire.addColorStop(0, '#2b2125'); fire.addColorStop(1, '#c8562b');
    ctx.fillStyle = fire;
    ctx.beginPath(); ctx.roundRect(10, 32, 22, 56, 3); ctx.fill(); ctx.stroke();
    ctx.save();
    ctx.translate(10, 34);
    ctx.rotate(-0.5);
    ctx.fillStyle = '#5a4a48';
    ctx.beginPath(); ctx.roundRect(-20, 0, 20, 50, 3); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  // Éperon et tampons
  ctx.fillStyle = '#4b4249';
  ctx.beginPath(); ctx.moveTo(2, 74); ctx.lineTo(-8, 96); ctx.lineTo(10, 96); ctx.lineTo(14, 92); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(237,230,214,0.35)';
  ctx.beginPath(); ctx.moveTo(-2, 88); ctx.lineTo(9, 88); ctx.moveTo(1, 81); ctx.lineTo(7, 81); ctx.stroke();
  ctx.restore();
}

// Porte du fourgon enfoncée (sur l'image Gemini) : trou rougeoyant, battant arraché qui pend
function brokenDoor(ctx, x, top, S, d) {
  const [x0, y0, x1, y1] = d;
  ctx.save();
  ctx.translate(x, top);
  ctx.scale(S, S);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, '#231b1f'); g.addColorStop(1, '#c8562b');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.roundRect(x0 + 2, y0 + 2, x1 - x0 - 4, y1 - y0 - 4, 2); ctx.fill(); ctx.stroke();
  // éclats de tôle autour
  ctx.fillStyle = '#6a4a3e';
  ctx.beginPath(); ctx.moveTo(x0, y0 + 10); ctx.lineTo(x0 + 7, y0 + 16); ctx.lineTo(x0, y0 + 22); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x1, y0 + 30); ctx.lineTo(x1 - 6, y0 + 37); ctx.lineTo(x1, y0 + 44); ctx.closePath(); ctx.fill(); ctx.stroke();
  // battant arraché
  ctx.translate(x0 + 2, y0 + 6);
  ctx.rotate(-0.55);
  ctx.fillStyle = '#5b4038';
  ctx.beginPath(); ctx.roundRect(-x1 + x0 + 4, 0, x1 - x0 - 4, y1 - y0 - 10, 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(237,230,214,0.25)';
  for (const k of [0.25, 0.55, 0.85]) { ctx.beginPath(); ctx.moveTo(-x1 + x0 + 6, (y1 - y0 - 10) * k); ctx.lineTo(-2, (y1 - y0 - 10) * k); ctx.stroke(); }
  ctx.restore();
}

// Jauge du fourgon : au-dessus de la vigie quand il a pris des coups
function cabooseBar(ctx, cx, y, S, cb) {
  const max = BUILD.caboose.hp[cb.level - 1];
  if (cb.hp >= max && !cb.attacked) return;
  const w = 56 * S, h = Math.max(4, 5 * S);
  ctx.save();
  ctx.fillStyle = 'rgba(43,42,51,0.85)';
  ctx.beginPath(); ctx.roundRect(cx - w / 2 - 2, y - 2, w + 4, h + 4, 3); ctx.fill();
  ctx.fillStyle = cb.breached ? '#C8382D' : '#9fb4c2';
  ctx.fillRect(cx - w / 2, y, w * Math.max(0, cb.hp / max), h);
  if (cb.breached) {
    // seuil de remise en état
    ctx.fillStyle = '#EDE6D6';
    ctx.fillRect(cx - w / 2 + w * BUILD.caboose.holdAt - 1, y - 1, 2, h + 2);
  }
  ctx.restore();
}

// ---------- Locomotive provisoire « La Braise » ----------
function block(ctx, x, y, w, h, fill) {
  ctx.fillStyle = fill; ctx.fillRect(x, y, w, h);
  ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.strokeRect(x, y, w, h);
}
function placeholderLoco(ctx, angle) {
  ctx.translate(0, 130);
  block(ctx, 8, -42, 226, 12, '#3a3238');
  ctx.fillStyle = '#b5562b';
  ctx.beginPath(); ctx.roundRect(72, -94, 150, 52, 14); ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
  block(ctx, 204, -92, 22, 50, '#3a3238');
  block(ctx, 200, -124, 16, 32, '#3a3238');
  block(ctx, 195, -130, 26, 8, '#2b2a33');
  block(ctx, 10, -110, 70, 70, '#8f4426');
  block(ctx, 4, -118, 82, 9, '#2b2a33');
  ctx.fillStyle = '#E8A33D'; ctx.fillRect(26, -98, 32, 24);
  ctx.fillStyle = '#5a5157';
  ctx.beginPath(); ctx.moveTo(226, -32); ctx.lineTo(244, -4); ctx.lineTo(226, -4); ctx.closePath(); ctx.fill();
  [26, 214].forEach(x => spokedWheel(ctx, x, -13, 13, angle * 1.7));
  [72, 120, 168].forEach(x => spokedWheel(ctx, x, -22, 22, angle));
}

// ---------- Roues et bielles de la locomotive (GDD : mouvement réaliste) ----------
// Les roues tournent ; les manetons tournent avec elles ; la bielle d'accouplement relie les manetons
// et reste horizontale (translation circulaire) ; la bielle motrice relie le maneton avant à la crosse,
// qui coulisse horizontalement dans sa glissière ; la tige de piston entre dans le cylindre.
function wheelSprite(ctx, img, x, y, r, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  drawSmooth(ctx, img, -r, -r, r * 2, r * 2);
  ctx.restore();
}

function rodBar(ctx, x1, y1, x2, y2, width, fill) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = width + 2.2;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.strokeStyle = fill;
  ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.restore();
}

function pin(ctx, x, y, r) {
  ctx.fillStyle = '#d8cfc2';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}

// Repère local : unités de l'image de la locomotive (0,0 = coin haut gauche)
function locoRunningGear(ctx, m, distance) {
  const drive = getImage('wheel_driver');
  const small = getImage('wheel_wagon') || drive;
  for (const [x, y, r] of m.small) {
    const a = distance / r;
    if (small) wheelSprite(ctx, small, x, y, r, a); else spokedWheel(ctx, x, y, r, a);
  }
  const R = m.drivers[0][2];
  const theta = distance / R;                       // même angle pour les deux roues motrices
  for (const [x, y, r] of m.drivers) {
    if (drive) wheelSprite(ctx, drive, x, y, r, theta); else spokedWheel(ctx, x, y, r, theta);
  }
  // Manetons
  const pins = m.drivers.map(([x, y]) => [x + Math.cos(theta) * m.crank, y + Math.sin(theta) * m.crank]);
  // Crosse : sur la glissière, à distance fixe (longueur de bielle) du maneton avant
  const [px, py] = pins[0];
  const dy = m.guideY - py;
  const cx = px + Math.sqrt(Math.max(0, m.rod * m.rod - dy * dy));
  // Tige de piston (crosse → cylindre)
  rodBar(ctx, cx, m.guideY, m.cylinderX + 2, m.guideY, 1.6, '#b8b0a6');
  // Bielle d'accouplement : horizontale, du dernier maneton au premier (elle relie toutes les roues motrices)
  const last = pins[pins.length - 1];
  rodBar(ctx, last[0], last[1], pins[0][0], pins[0][1], 2.6, '#d8cfc2');
  // Bielle motrice : du maneton avant à la crosse
  rodBar(ctx, px, py, cx, m.guideY, 2.4, '#c9c0b4');
  // Crosse
  ctx.fillStyle = '#3E8E8A';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.roundRect(cx - 3, m.guideY - 2.6, 6, 5.2, 1.2); ctx.fill(); ctx.stroke();
  pins.forEach(([x, y]) => pin(ctx, x, y, 1.6));
  pin(ctx, cx, m.guideY, 1.2);
}

// ---------- Bogie de wagon : châssis Gemini + 2 roues Gemini (sinon dessin du code) ----------
function wagonBogie(ctx, cx, railY, S, distance) {
  const frame = getImage('bogie');
  const wheel = getImage('wheel_wagon');
  const b = SPRITES.bogie;
  if (!frame || !wheel) { bogie(ctx, cx, railY, S, distance / WHEEL_R); return; }
  const w = b.w * S, h = w * b.aspect;
  const r = b.wheelR * S;
  const x0 = cx - w / 2;
  const top = railY - r - b.axleY * h;
  const a = distance / b.wheelR;
  for (const f of b.axles) wheelSprite(ctx, wheel, x0 + f * w, railY - r, r, a);
  drawSmooth(ctx, frame, x0, top, w, h);
}

// ---------- Attelage entre deux voitures ----------
function coupler(ctx, left, right, railY, S) {
  const img = getImage('coupler');
  const y = railY - COUPLER_H * S;
  if (img) {
    const w = (left - right) + 6 * S;
    const h = w * SPRITES.coupler.aspect * 0.65;
    drawSmooth(ctx, img, right - 3 * S, y - h * 0.3, w, h);
    return;
  }
  ctx.fillStyle = '#4a4247';
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, 1.2 * S);
  ctx.beginPath(); ctx.roundRect(right, y - 1.6 * S, left - right, 3.2 * S, 1.6 * S); ctx.fill(); ctx.stroke();
}

// Cadre d'une voiture à l'écran (partagé avec l'équipage et les touchers)
export function carFrame(car, view) {
  const { W, railY, S, cx, distance, running } = view;
  const x = W / 2 + (car.x0 - cx) * S;
  const w = (car.x1 - car.x0) * S;
  const bob = running ? Math.sin(distance / 16 + car.x0 * 0.05) * 0.8 : 0;
  const m = car.meta;
  if (car.kind === 'loco') {
    const top = railY - (m.rail || m.h) * S;
    return { x, w, top, bottom: railY, bob };
  }
  const bottom = railY - BOGIE_H * S + bob;
  return { x, w, top: bottom - m.h * S, bottom, bob };
}

// ---------- Dessin du convoi ----------
// view : { W, railY, S, cx, distance, running }
// Renvoie la position de la cheminée à l'écran (pour la fumée)
export function drawTrain(ctx, cars, view) {
  const { W, railY, S, cx, distance, running } = view;
  const toX = u => W / 2 + (u - cx) * S;
  let chimney = null;

  // Attelages, derrière les voitures
  for (let i = 0; i < cars.length - 1; i++) {
    coupler(ctx, toX(cars[i].x0), toX(cars[i + 1].x1), railY, S);
  }

  for (const car of cars) {
    const x = toX(car.x0);
    const w = (car.x1 - car.x0) * S;
    if (x > W + 20 || x + w < -20) continue;                       // hors champ
    const bob = running ? Math.sin(distance / 16 + car.x0 * 0.05) * 0.8 : 0;
    const m = car.meta;

    if (car.kind === 'loco') {
      const rail = m.rail || m.h;
      const top = railY - rail * S;
      ctx.save();
      ctx.translate(x, top);
      ctx.scale(S, S);
      if (car.image && m.drivers) {
        drawSmooth(ctx, car.image, 0, bob / S, m.w, m.h);
        locoRunningGear(ctx, m, distance);
      } else {
        placeholderLoco(ctx, distance / 22);
      }
      ctx.restore();
      chimney = { x: x + m.chimney[0] * S, y: top + m.chimney[1] * S + bob };
    } else {
      const bottom = railY - BOGIE_H * S + bob;
      const top = bottom - m.h * S;
      const cab = car.wagon.type === 'caboose';
      for (const f of m.bogies || (cab ? [0.5] : [0.21, 0.79])) wagonBogie(ctx, x + w * f, railY, S, distance);
      const roof = car.image ? roofArt(car) : null;
      if (cab && !car.image) drawCaboose(ctx, x, top, S, car.wagon, distance);
      else if (car.image) {
        const broken = cab && car.wagon.breached ? getImage('wagon_caboose_breached') : null;
        const hh = (m.h + (m.below || 0)) * S;
        if (roof) {
          // Extension de toit : le haut du wagon est coupé et l'extension posée à la place
          const cut = top + m.roof * S;
          ctx.save();
          ctx.beginPath(); ctx.rect(x - 4, cut, w + 8, hh); ctx.clip();
          drawSmooth(ctx, car.image, x, top, w, hh);
          ctx.restore();
          const rh = w * roof.meta.ratio;
          drawSmooth(ctx, roof.img, x, cut - rh, w, rh);
        } else drawSmooth(ctx, broken || car.image, x, top, w, hh);
        if (cab && car.wagon.breached && m.door && !broken) brokenDoor(ctx, x, top, S, m.door);
      }
      else placeholderWagon(ctx, x, top, w, m.h * S, car.wagon.type);
      // Têtes de tourelle (wagon Tourelle, Tourelle auto du toit), tournées vers leur cible
      const hp = headPlace(car, x, top, w, S);
      if (hp) drawHead(ctx, hp, car.wagon.aim);
      if (!roof) {
        if (car.wagon.attic) drawAttic(ctx, x, top, w, S);
        if (car.wagon.berths) drawBerths(ctx, x, top, w, S);
        if (car.wagon.roofTurret) drawRoofTurret(ctx, x, top, w, S, performance.now() / 1000);
      }
      if (car.wagon.level > 1) levelMarks(ctx, x + (cab ? (car.image ? 70 : 36) * S : 0), bottom, S, car.wagon.level);
      if (cab) cabooseBar(ctx, x + w * (car.image ? 0.72 : 0.5), top - (car.image ? 10 : 28) * S, S, car.wagon);
    }
  }
  return chimney;
}

// ---------- Fumée : réserve de particules réutilisées ----------
const POOL = Array.from({ length: 90 }, () => ({ on: false, x: 0, y: 0, vx: 0, vy: 0, r: 0, life: 0, max: 1 }));
let emitAcc = 0;

export function updateSmoke(dt, source, trainPx, S, active) {
  if (active && source) {
    emitAcc += dt * 16;
    while (emitAcc >= 1) {
      emitAcc -= 1;
      const p = POOL.find(q => !q.on);
      if (!p) break;
      p.on = true;
      p.x = source.x + (Math.random() - 0.5) * 6 * S;
      p.y = source.y;
      p.vx = -(trainPx * 0.55) - 12 * S;
      p.vy = -(26 + Math.random() * 16) * S;
      p.r = 6 * S;
      p.life = 0;
      p.max = 1.6 + Math.random() * 0.8;
    }
  }
  for (const p of POOL) {
    if (!p.on) continue;
    p.life += dt;
    if (p.life >= p.max) { p.on = false; continue; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy *= 0.985;
    p.r += 14 * S * dt;
  }
}

export function drawSmoke(ctx) {
  for (const p of POOL) {
    if (!p.on) continue;
    const k = 1 - p.life / p.max;
    ctx.fillStyle = `rgba(222,214,202,${0.5 * k})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  }
}

// Fumée déplacée quand la caméra bouge (elle reste attachée au paysage)
export function shiftSmoke(dx) {
  for (const p of POOL) if (p.on) p.x += dx;
}
