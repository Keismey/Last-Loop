// Ennemis dans la scène (GDD §14.3) : approche, accrochage, tirs des tourelles, explosions,
// barres de PV, réticule de la cible prioritaire, flèches pour les ennemis hors champ, barre du boss.
// Dessins provisoires faits par le code ; une image enemy_<id> (Gemini) les remplace dès qu'elle existe.
import { carFrame, muzzlePoint } from './train.js';
import { getImage } from './assets.js';
import { drawSmooth } from './mip.js';
import { COMBAT } from '../data/enemies.js';
import { statsOf } from '../sim/combat.js';
import { BOSSES } from '../data/enemies.js';
import { t } from '../core/i18n.js';
import { hits as crewHits } from './crewLayer.js';
import { weaponType } from '../sim/equipment.js';
import { WEAPONS } from '../data/items.js';
import { ENEMY_SPRITES } from '../data/enemySprites.js';

const INK = '#2B2A33';
const K = 1.45;          // taille des ennemis par rapport aux unités du train
const KB = 1.25;         // taille du boss
export const enemyHits = [];
const ease = p => 1 - Math.pow(1 - Math.max(0, Math.min(1, p)), 2);

function shape(ctx, fill, draw, lw = 1.4) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.beginPath();
  draw();
  ctx.fill();
  ctx.stroke();
}

function wheel(ctx, x, y, r, a) {
  shape(ctx, '#3a3238', () => ctx.arc(x, y, r, 0, Math.PI * 2));
  ctx.strokeStyle = '#8c8287';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7);
  ctx.lineTo(x - Math.cos(a) * r * 0.7, y - Math.sin(a) * r * 0.7);
  ctx.stroke();
}

// Silhouette humaine simple : pieds en (0, 0), tournée vers la droite
function brute_body(ctx, o) {
  const { h = 34, cloth = '#6b4a3a', skin = '#c99a7a', helmet = '#5c5358', t = 0, run = 0, swing = 0, big = 1 } = o;
  const leg = h * 0.38, torso = h * 0.36, hr = h * 0.12;
  const st = Math.sin(t * 12) * run * 4;
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.4 * big;
  ctx.beginPath(); ctx.moveTo(-2 * big, -leg); ctx.lineTo(-3 - st, 0); ctx.moveTo(2 * big, -leg); ctx.lineTo(3 + st, 0); ctx.stroke();
  ctx.strokeStyle = '#3a3238';
  ctx.lineWidth = 2.2 * big;
  ctx.beginPath(); ctx.moveTo(-2 * big, -leg); ctx.lineTo(-3 - st, 0); ctx.moveTo(2 * big, -leg); ctx.lineTo(3 + st, 0); ctx.stroke();
  const lean = run ? 3 : 0;
  shape(ctx, cloth, () => ctx.roundRect(-5 * big + lean * 0.3, -leg - torso, 10 * big, torso + 1, 3 * big));
  shape(ctx, skin, () => ctx.arc(lean, -leg - torso - hr + 1, hr, 0, Math.PI * 2));
  shape(ctx, helmet, () => ctx.arc(lean, -leg - torso - hr, hr * 1.02, Math.PI, 0));
  // Bras armé (barre de fer)
  const a = -0.6 + swing;
  const sx = 2 * big + lean * 0.3, sy = -leg - torso + 3;
  const ex = sx + Math.cos(a) * h * 0.3, ey = sy + Math.sin(a) * h * 0.3 + h * 0.12;
  ctx.strokeStyle = INK; ctx.lineWidth = 3 * big;
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.strokeStyle = '#8c8287'; ctx.lineWidth = 2.2 * big;
  ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + Math.cos(a - 1.2) * h * 0.32, ey + Math.sin(a - 1.2) * h * 0.32); ctx.stroke();
}

const DRAW = {
  biker(ctx, e, t, attached) {
    const a = t * 14;
    wheel(ctx, -11, -6, 6, a);
    wheel(ctx, 12, -6, 6, a);
    shape(ctx, '#8f3a24', () => { ctx.moveTo(-11, -7); ctx.lineTo(-2, -15); ctx.lineTo(9, -15); ctx.lineTo(12, -7); ctx.lineTo(4, -9); ctx.closePath(); });
    shape(ctx, '#3a3238', () => ctx.roundRect(-6, -17, 10, 3, 1.5));
    ctx.save(); ctx.translate(-1, -15);
    brute_body(ctx, { h: 22, cloth: '#a8432a', helmet: '#2f2b30', t, swing: attached ? Math.sin(t * 7) * 0.9 : 0 });
    ctx.restore();
  },
  runner(ctx, e, t, attached) {
    brute_body(ctx, { h: 32, cloth: '#b5562b', helmet: '#C8382D', t, run: attached ? 0 : 1, swing: attached ? Math.sin(t * 6) * 1 : 0 });
  },
  militia(ctx, e, t, attached) {
    brute_body(ctx, { h: 32, cloth: '#4f6273', helmet: '#3e4c58', t, run: attached ? 0 : 1, swing: attached ? -0.4 : 0 });
  },
  brute(ctx, e, t, attached) {
    brute_body(ctx, { h: 50, cloth: '#5c5358', skin: '#b48a6e', helmet: '#3a3238', t, run: attached ? 0 : 0.6, swing: attached ? Math.abs(Math.sin(t * 3)) * 1.6 : 0, big: 1.6 });
    // Plaques de blindage
    ctx.fillStyle = '#8c8287'; ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.roundRect(-9, -36, 16, 9, 2); ctx.fill(); ctx.stroke();
  },
  drone(ctx, e, t) {
    shape(ctx, '#4a4247', () => ctx.ellipse(0, 0, 9, 5, 0, 0, Math.PI * 2));
    shape(ctx, '#C8382D', () => ctx.arc(5, 0.5, 2, 0, Math.PI * 2), 1);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-8, -3); ctx.lineTo(-13, -7); ctx.moveTo(8, -3); ctx.lineTo(13, -7); ctx.stroke();
    ctx.fillStyle = 'rgba(237,230,214,0.45)';
    const w = 7 * Math.abs(Math.sin(t * 40));
    ctx.beginPath(); ctx.ellipse(-13, -8, w + 2, 1.4, 0, 0, Math.PI * 2); ctx.ellipse(13, -8, w + 2, 1.4, 0, 0, Math.PI * 2); ctx.fill();
  },
  wolf(ctx, e, t) {
    const s = Math.sin(t * 14) * 3;
    shape(ctx, '#9aa6b0', () => ctx.ellipse(0, -11, 13, 6, 0, 0, Math.PI * 2));
    shape(ctx, '#9aa6b0', () => ctx.ellipse(13, -15, 6, 4.5, -0.3, 0, Math.PI * 2));
    ctx.strokeStyle = INK; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(-8, -7); ctx.lineTo(-9 - s, 0); ctx.moveTo(8, -7); ctx.lineTo(9 + s, 0); ctx.stroke();
  },
  sandcrawler(ctx, e, t) {
    shape(ctx, '#b08a52', () => ctx.ellipse(0, -9, 18, 9, 0, Math.PI, 0));
    ctx.strokeStyle = INK; ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) { const k = Math.sin(t * 12 + i) * 2; ctx.beginPath(); ctx.moveTo(i * 6, -4); ctx.lineTo(i * 6 + 3 + k, 0); ctx.stroke(); }
  },
  wraith(ctx, e, t) {
    ctx.globalAlpha *= 0.85;
    shape(ctx, '#6fb7b1', () => { ctx.moveTo(-10, 0); ctx.quadraticCurveTo(-12, -40, 0, -46); ctx.quadraticCurveTo(12, -40, 10, 0); ctx.closePath(); });
    shape(ctx, '#F2C14E', () => ctx.arc(3, -34, 3, 0, Math.PI * 2), 1);
  }
};

// Le Roi des Rails : camion de guerre sur rails (dessiné vers la droite, pare-chocs en x = 0)
function drawWarTruck(ctx, t, attached) {
  const a = t * 10;
  [-120, -86, -40, -12].forEach(x => wheel(ctx, x, -9, 9, a));
  shape(ctx, '#5c4a42', () => ctx.roundRect(-140, -46, 118, 34, 4), 1.8);
  shape(ctx, '#8f3a24', () => { ctx.moveTo(-24, -12); ctx.lineTo(-24, -58); ctx.lineTo(-4, -58); ctx.lineTo(4, -40); ctx.lineTo(4, -12); ctx.closePath(); }, 1.8);
  shape(ctx, '#e8a33d', () => ctx.roundRect(-18, -54, 14, 10, 2), 1.2);              // vitre éclairée
  shape(ctx, '#8c8287', () => { ctx.moveTo(4, -12); ctx.lineTo(16, -4); ctx.lineTo(4, -34); ctx.closePath(); }, 1.6); // chasse-pierres
  shape(ctx, '#3a3238', () => ctx.roundRect(-118, -64, 40, 16, 3), 1.6);              // tourelle
  const rec = attached ? Math.max(0, Math.sin(t * 3)) * 4 : 0;
  shape(ctx, '#3a3238', () => ctx.roundRect(-82 - rec, -60, 46, 6, 2), 1.4);          // canon
  shape(ctx, '#F2C14E', () => { ctx.moveTo(-132, -46); ctx.lineTo(-126, -54); ctx.lineTo(-120, -46); ctx.closePath(); }, 1); // couronne
  for (let i = 0; i < 4; i++) { ctx.fillStyle = '#8c8287'; ctx.beginPath(); ctx.arc(-130 + i * 26, -28, 2, 0, Math.PI * 2); ctx.fill(); }
}

// ---------- Position à l'écran ----------
function enemyScreen(e, cars, view, H, time) {
  const { S, railY, W } = view;
  const car = cars[Math.min(cars.length - 1, e.wagon + 1)];
  if (!car) return null;
  const f = carFrame(car, view);
  const D = COMBAT.approachDist * S;
  if (e.boss) {
    const sz0 = spriteSize(e, S);
    const bw = sz0 ? sz0.w : 150 * S * KB;
    // Hors des rails : il longe le train sur la voie de devant, centré sur le wagon visé
    if (e.bp === 'move' || e.bp === 'strike' || e.bp === 'jump') {
      const center = cc => { const ff = carFrame(cc, view); return ff.x + ff.w / 2; };
      let cxm = f.x + f.w / 2;
      if (e.bp === 'move' && e.moveFrom !== undefined) {
        const c0 = cars[Math.min(cars.length - 1, e.moveFrom + 1)];
        if (c0) cxm = center(c0) + (cxm - center(c0)) * ease(Math.min(1, e.bt / BOSSES[e.type].moveSec));
      }
      let y = railY + 24 * S;
      if (e.bp === 'jump') {
        const p = Math.min(1, e.bt / BOSSES[e.type].jumpSec);
        cxm = f.x - bw * 0.3 + p * bw * 0.4;
        y = railY + 24 * S * p - Math.sin(Math.PI * p) * 70 * S;
      }
      if (e.bp === 'strike') cxm += Math.sin(time * 9) * 3 * S;
      const x = cxm + bw / 2;
      return { x, y, fly: false, f, off: true, cx: cxm, cy: y - (sz0 ? sz0.h : 80 * S) / 2, r: (sz0 ? sz0.h : 80 * S) * 0.55 };
    }
    const tx = f.x - 6 * S;
    let x = tx;
    if (e.phase === 'approach') x = tx - (1 - ease(e.t / e.arrive)) * D;
    if (e.phase === 'leave') x = tx - ease(e.t / 1.5) * D;
    // Bélier : il recule pendant l'alerte, puis fonce dans le fourgon
    if (e.bp === 'ram') {
      const R = BOSSES[e.type].ram;
      const q = e.bt / R.warn;
      if (q < 1) x -= (q < 0.7 ? ease(q / 0.7) : 1 - (q - 0.7) / 0.3) * 50 * S;
    }
    const sz = sz0;
    if (sz) return { x, y: railY, fly: false, f, cx: x - sz.w / 2, cy: railY - sz.h / 2, r: sz.h * 0.55 };
    return { x, y: railY, fly: false, f, cx: x - 70 * S * KB, cy: railY - 40 * S * KB, r: 60 * S * KB };
  }
  const fly = !!statsOf(e).fly;
  let tx = f.x + f.w * (0.5 + e.lane * 0.62);
  // Passage d'un wagon à l'autre (propagation, avancée vers la locomotive)
  if (e.moveT !== undefined && e.moveT < 1 && e.moveFrom !== undefined) {
    const c0 = cars[Math.min(cars.length - 1, e.moveFrom + 1)];
    if (c0) { const f0 = carFrame(c0, view); const fx = f0.x + f0.w * (0.5 + e.lane * 0.62); tx = fx + (tx - fx) * ease(e.moveT); }
  }
  let x = tx;
  if (e.phase === 'approach') x = tx + e.side * (1 - ease(e.t / e.arrive)) * D;
  if (e.phase === 'leave') x = tx - ease(e.t / 1.5) * D * 1.2;
  if (e.phase === 'dead' && e.diedAt !== undefined) x = tx + e.side * (1 - ease(e.diedAt)) * D;
  const sz = spriteSize(e, S);
  // Volant : en image, il plane juste au-dessus du toit (la scie à hauteur du toit)
  const flyY = sz ? f.top + 8 * S : f.top - 16 * S;
  const y = fly ? flyY + Math.sin(time * 3 + e.id) * 3 * S : railY + (10 + (e.id % 3) * 3) * S;
  if (sz) return { x, y, fly, f, cx: x, cy: y - sz.h * 0.5, r: Math.max(sz.h * 0.45, sz.w * 0.4), W };
  const big = e.type === 'brute' ? 1.5 : 1;
  return { x, y, fly, f, cx: x, cy: fly ? y : y - 18 * S * big * K, r: 20 * S * big * K, W };
}

// Wagons attaqués : ils clignotent en rouge dans la coupe (GDD §6.1)
function drawAttacked(ctx, state, cars, view, time) {
  const a = 0.14 + 0.12 * Math.sin(time * 10);
  for (const car of cars) {
    if (car.kind !== 'wagon' || !car.wagon.attacked) continue;
    const f = carFrame(car, view);
    ctx.fillStyle = `rgba(200,56,45,${a})`;
    ctx.beginPath(); ctx.roundRect(f.x + 3, f.top + 3, f.w - 6, f.bottom - f.top - 6, 8); ctx.fill();
  }
}

function hpBar(ctx, x, y, w, ratio, S) {
  const h = Math.max(3, 4 * S);
  ctx.fillStyle = 'rgba(31,30,37,0.85)';
  ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = ratio > 0.5 ? '#8fd17e' : ratio > 0.25 ? '#E8A33D' : '#C8382D';
  ctx.fillRect(x - w / 2, y, w * Math.max(0, ratio), h);
}

function reticle(ctx, x, y, r, time) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(time * 1.5);
  ctx.strokeStyle = '#ff5a4a';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2);
    ctx.beginPath(); ctx.moveTo(r - 4, 0); ctx.lineTo(r + 5, 0); ctx.stroke();
  }
  ctx.restore();
}

// Chute d'un ennemi : petit nuage de poussière au sol
function dust(ctx, x, y, t, S) {
  const p = Math.min(1, t / 0.8);
  ctx.save();
  ctx.globalAlpha = 0.5 * (1 - p);
  ctx.fillStyle = '#b9a58a';
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath(); ctx.ellipse(x + i * (6 + p * 10) * S, y - (2 + p * 4) * S, (5 + p * 6) * S, (3 + p * 3) * S, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function explosion(ctx, x, y, t, S, big) {
  const p = t / 0.8;
  const r = (10 + 26 * p) * S * big;
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - p);
  ctx.fillStyle = '#F2C14E';
  ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e07a3a';
  ctx.beginPath(); ctx.arc(x, y, r * 0.38, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(80,72,76,0.8)';
  for (let i = 0; i < 5; i++) {
    const a = i * 1.26;
    ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.5 - p * 10 * S, r * 0.3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// Origine des tirs d'une tourelle (canon en haut du wagon)
function gunPoint(cars, view, i) {
  const car = cars[i + 1];
  if (!car) return null;
  const m = muzzlePoint(car, view);
  if (m) return m;
  const f = carFrame(car, view);
  return { x: f.x + f.w * 0.8, y: f.top + 14 * view.S };     // bout des canons de la tourelle
}

// Planches animées (Gemini) : un canvas par cadre, découpé une fois dans l'atlas
const animCache = new Map();
function animOf(type) {
  const meta = ENEMY_SPRITES[type];
  if (!meta) return null;
  let frames = animCache.get(type);
  if (!frames) {
    const img = getImage('en_' + type);
    if (!img) return null;
    frames = meta.rects.map(([x, y, w, h]) => {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, x, y, w, h, 0, 0, w, h);
      return c;
    });
    animCache.set(type, frames);
  }
  return { meta, frames };
}
// Cadence des poses (s par image)
const TEMPO = { biker: 0.11, runner: 0.09, brute: 0.17, militia: 0.15 };
const ATTACK = { biker: 0.32, runner: 0.38, brute: 0.55, militia: 0.4 };
const hurtUntil = new WeakMap();     // ennemi → fin de la grimace (render seulement)

function pick(list, t, tempo) { return list[Math.floor(t / tempo) % list.length]; }

// Cadre d'un ennemi selon ce qu'il fait ; null : pas de planche
function enemyFrame(e, t, attached, now) {
  const A = animOf(e.type);
  if (!A) return null;
  const P = A.meta.poses;
  if (e.boss) {
    const B = BOSSES[e.type];
    const low = e.hp / e.max < 0.33;
    const roll = low ? P.wreck : P.move;
    let f;
    if (e.phase === 'dead') f = P.wreck[0];
    else if (e.bp === 'jump') f = P.jump[0];
    else if (e.bp === 'ram') {
      const q = e.bt / B.ram.warn;
      f = (q > 0.7 && q < 1.35) ? P.charge[0] : pick(roll, t, 0.12);
    } else if (e.bp === 'strike') f = (t % 0.9) < 0.22 ? P.fire[0] : pick(roll, t, 0.12);
    else f = pick(roll, t, 0.12);
    return { A, f };
  }
  let f;
  if (e.phase === 'dead') f = P.dead[0];
  else {
    // Grimace quand il prend un coup (pas plus d'une fois toutes les 0,7 s)
    const hu = hurtUntil.get(e);
    if (now - e.hitT < 0.05 && e.hitT > 0 && (!hu || now > hu + 0.5)) hurtUntil.set(e, now + 0.2);
    const h2 = hurtUntil.get(e);
    if (h2 && now < h2) f = P.hurt[0];
    else if (attached && e.moveT === undefined || attached && e.moveT >= 1) f = pick(P.attack, t, ATTACK[e.type] || 0.4);
    else f = pick(P.move, t, TEMPO[e.type] || 0.12);
  }
  return { A, f };
}

// Images Gemini : planches animées, ou image fixe animée par le code (course, coups, recul du boss)
function sprite(ctx, e, x, y, S, flip, t, attached, now) {
  const sz = spriteSize(e, S);
  if (!sz) return false;
  const an = enemyFrame(e, t, attached, now);
  if (an) {
    const { A, f } = an;
    const [, , fw, fh, ax, ay] = A.meta.rects[f];
    const k = sz.h / A.meta.refH;
    ctx.save();
    if (e.phase === 'dead') ctx.globalAlpha *= Math.max(0, 1 - e.t / 0.8);
    if (e.boss) {
      const shake = attached ? Math.sin(t * 30) * 0.8 * S : 0;
      const hitRam = e.bp === 'ram' && e.rammed && e.bt - BOSSES[e.type].ram.warn < 0.35 ? Math.sin(t * 70) * 2.5 * S : 0;
      drawSmooth(ctx, A.frames[f], x - ax * k + hitRam, y - ay * k + shake + 1.5 * S, fw * k, fh * k);
      if (e.hp / e.max < 0.33 && e.phase !== 'dead') smoke(ctx, x - sz.w * 0.55, y - sz.h * 0.85, t, S);
    } else {
      // Petit rebond de la moto à l'approche ; les autres sont animés par leurs images
      const bob = e.type === 'biker' && !attached ? Math.sin(t * 22) * 0.8 * S : 0;
      ctx.translate(x, y + bob);
      if (flip) ctx.scale(-1, 1);
      drawSmooth(ctx, A.frames[f], -ax * k, -ay * k, fw * k, fh * k);
    }
    ctx.restore();
    return true;
  }
  const { img, w, h } = sz;
  ctx.save();
  if (e.boss) {
    const shake = attached ? Math.sin(t * 30) * 0.8 * S : 0;
    const recoil = attached && e.bp !== 'ram' ? Math.max(0, Math.sin(t * 2.5)) * 3 * S : 0;
    // Saut hors des rails : le nez se lève puis retombe
    if (e.bp === 'jump') {
      const p = Math.min(1, e.bt / BOSSES[e.type].jumpSec);
      ctx.translate(x - w / 2, y - h / 2);
      ctx.rotate(-0.22 * Math.sin(Math.PI * p));
      ctx.translate(-(x - w / 2), -(y - h / 2));
    }
    drawSmooth(ctx, img, x - w - recoil, y - h + shake + 1.5 * S, w, h);
    ctx.restore();
    return true;
  }
  let bob = 0, tilt = 0;
  if (e.phase === 'approach') {
    bob = e.type === 'biker' ? Math.sin(t * 22) * 0.8 * S : -Math.abs(Math.sin(t * 9)) * 3 * S;
    tilt = e.type === 'biker' ? 0 : 0.06;
  } else if (attached) {
    const k = Math.sin(t * (e.type === 'brute' ? 3.5 : 6));
    tilt = -0.08 * k;
    bob = -Math.max(0, k) * 2 * S;
  }
  ctx.translate(x, y + bob);
  if (flip) ctx.scale(-1, 1);
  ctx.rotate(tilt);
  drawSmooth(ctx, img, -w / 2, -h, w, h);
  ctx.restore();
  return true;
}

// Fumée noire du boss mal en point
function smoke(ctx, x, y, t, S) {
  ctx.save();
  for (let i = 0; i < 5; i++) {
    const p = ((t * 0.7 + i / 5) % 1);
    ctx.globalAlpha = 0.45 * (1 - p);
    ctx.fillStyle = '#2e2a2c';
    ctx.beginPath();
    ctx.arc(x - p * 26 * S + Math.sin(i * 2.3) * 4 * S, y - p * 40 * S, (5 + p * 12) * S, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Taille d'une image d'ennemi à l'écran (hauteur fixée en unités du train), ou null sans image
const SPRITE_H = { biker: 56, runner: 52, militia: 52, brute: 74, drone: 40, boss_c1: 108 };
function spriteSize(e, S) {
  const h = (SPRITE_H[e.type] || 52) * S;
  const A = animOf(e.type);
  if (A) {
    const r = A.meta.rects[A.meta.poses.move[0]];
    return { img: null, h, w: h * r[2] / A.meta.refH };
  }
  const img = getImage(e.boss ? e.type : 'enemy_' + e.type);
  if (!img) return null;
  return { img, h, w: h * (img.naturalWidth || img.width) / (img.naturalHeight || img.height) };
}

// ---------- Dessin ----------
export function drawEnemies(ctx, state, cars, view, time) {
  enemyHits.length = 0;
  const c = state.combat;
  if (!c) return;
  const { S, W } = view;
  drawAttacked(ctx, state, cars, view, time);
  if (!c.enemies.length) return;
  const offLeft = [], offRight = [];
  let boss = null;

  // Tirs : traits lumineux des tourelles vers leur cible
  for (const e of c.enemies) {
    if (state.time - e.hitT > 0.15 || e.phase === 'leave') continue;
    let g = null;
    if (e.hitBy >= 0) g = gunPoint(cars, view, e.hitBy);
    else if (e.hitCrew) {
      // Tir d'un survivant armé d'une arme à distance
      const s = state.crew.find(x => x.id === e.hitCrew);
      const h = s && crewHits.survivors.find(x => x.s === s);
      if (!h || !s || !(WEAPONS[weaponType(state, s)].range > 0)) continue;
      g = { x: h.x + 8 * S, y: h.y - 2 * S };
    }
    const p = enemyScreen(e, cars, view, 0, time);
    if (!g || !p) continue;
    const flick = Math.sin(time * 60 + e.id) > -0.2;
    if (!flick) continue;
    ctx.strokeStyle = 'rgba(242,193,78,0.9)';
    ctx.lineWidth = Math.max(1.5, 2 * S);
    ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(p.cx, p.cy); ctx.stroke();
    ctx.fillStyle = '#fff1c4';
    ctx.beginPath(); ctx.arc(p.cx, p.cy, 4 * S, 0, Math.PI * 2); ctx.fill();
  }

  for (const e of c.enemies) {
    const p = enemyScreen(e, cars, view, 0, time);
    if (!p) continue;
    if (e.boss && e.phase !== 'dead') boss = e;
    if (e.phase === 'dead') {
      if (!e.boss && animOf(e.type)) {
        ctx.save();
        sprite(ctx, e, p.x, p.y, S, e.side > 0 || e.lane > 0, time + e.id * 0.37, false, state.time);
        ctx.restore();
        dust(ctx, p.x, p.y, e.t, S);
      } else explosion(ctx, p.cx, p.cy, e.t, S, e.boss ? 3 : e.type === 'brute' ? 1.5 : 1);
      continue;
    }
    const attached = e.phase === 'attached';
    if (p.cx < -10) { if (attached) offLeft.push(e); continue; }
    if (p.cx > W + 10) { if (attached) offRight.push(e); continue; }
    ctx.save();
    if (e.phase === 'leave') ctx.globalAlpha = Math.max(0, 1 - e.t / 1.6);
    const moving = e.moveT !== undefined && e.moveT < 1;
    const flip = e.boss ? false : e.phase === 'leave' ? true : moving ? e.wagon > e.moveFrom : attached ? e.lane > 0 : e.side > 0;
    // Ombre rougeâtre au sol : on repère les ennemis d'un coup d'œil
    if (!p.fly && !e.boss) {
      ctx.fillStyle = 'rgba(200,56,45,0.35)';
      ctx.beginPath(); ctx.ellipse(p.x, p.y, 15 * S * K, 3.5 * S * K, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (!sprite(ctx, e, p.x, p.y, S, flip, time + e.id * 0.37, attached, state.time)) {
      const k = S * (e.boss ? KB : K);
      ctx.translate(p.x, p.y);
      ctx.scale(flip ? -k : k, k);
      const tt = time + e.id * 0.37;
      if (e.boss) drawWarTruck(ctx, tt, attached);
      else (DRAW[e.type] || DRAW.runner)(ctx, e, tt, attached);
    }
    ctx.restore();
    // Flash à l'impact
    if (state.time - e.hitT < 0.08) {
      ctx.fillStyle = e.boss ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.arc(p.cx, p.cy, p.r * 0.6, 0, Math.PI * 2); ctx.fill();
    }
    if (e.phase === 'leave') continue;
    const top = p.cy - p.r - 6 * S;
    if (!e.boss && (e.hp < e.max || c.target === e.id)) hpBar(ctx, p.cx, top, 26 * S, e.hp / e.max, S);
    if (c.target === e.id) reticle(ctx, p.cx, p.cy, p.r * 0.9, time);
    enemyHits.push({ id: e.id, x: p.cx, y: p.cy, r: Math.max(22, p.r) });
  }

  // Bélier du boss : « ! » rouge au-dessus du fourgon pendant l'alerte (le temps de placer des gardes)
  if (boss && boss.warn) {
    const car = cars[Math.min(cars.length - 1, boss.wagon + 1)];
    const f = car && carFrame(car, view);
    if (f) {
      const x = f.x + f.w * 0.5, y = f.top + 34 * S, r = (14 + 3 * Math.sin(time * 12)) * Math.max(0.8, S);
      ctx.save();
      ctx.fillStyle = '#C8382D'; ctx.strokeStyle = '#1f1e25'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = `900 ${Math.round(r * 1.4)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('!', x, y + 1);
      ctx.restore();
    }
  }

  // Ennemis accrochés hors champ : flèche rouge au bord avec leur nombre
  const arrow = (list, left) => {
    if (!list.length) return;
    const x = left ? 14 : W - 14, y = view.railY - 46 * S;
    ctx.save();
    ctx.translate(x, y);
    if (!left) ctx.scale(-1, 1);
    ctx.fillStyle = '#C8382D';
    ctx.strokeStyle = '#1f1e25';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(6, -10); ctx.lineTo(6, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#EDE6D6';
    ctx.font = '800 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(list.length), x, y + 24);
  };
  arrow(offLeft, true);
  arrow(offRight, false);

  // Barre de PV du boss, en haut de la scène
  if (boss) {
    const w = Math.min(320, W * 0.5), x = W / 2, y = 22;
    ctx.fillStyle = 'rgba(31,30,37,0.85)';
    ctx.beginPath(); ctx.roundRect(x - w / 2 - 4, y - 4, w + 8, 14, 7); ctx.fill();
    ctx.fillStyle = '#C8382D';
    ctx.beginPath(); ctx.roundRect(x - w / 2, y, w * Math.max(0, boss.hp / boss.max), 6, 3); ctx.fill();
    if (c.target === boss.id) { ctx.strokeStyle = '#ff5a4a'; ctx.lineWidth = 1.5; ctx.strokeRect(x - w / 2 - 4, y - 4, w + 8, 14); }
    ctx.font = '800 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(31,30,37,0.9)';
    ctx.strokeText(t('boss.' + boss.type), x, y + 22);
    ctx.fillStyle = '#EDE6D6';
    ctx.fillText(t('boss.' + boss.type), x, y + 22);
  }
}

export function enemyAt(x, y) {
  let best = null, bd = Infinity;
  for (const h of enemyHits) {
    const d = Math.hypot(h.x - x, h.y - y);
    if (d < h.r && d < bd) { best = h; bd = d; }
  }
  return best;
}
