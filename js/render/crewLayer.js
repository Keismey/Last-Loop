// Équipage dans le train (GDD §14.3, §14.4) : survivants à leur poste, au repos dans les couchages,
// emplacements de poste (cercles pointillés), surbrillance pendant un glisser-déposer.
// Enregistre aussi les zones touchables de l'image (postes, survivants, wagons) pour l'interface.
import { carFrame, BERTHS, berthSpots } from './train.js';
import { drawPuppet, PUPPET_HEIGHT } from './puppets.js';
import { WAGONS, slotCount } from '../data/wagons.js';
import { restingPlaces, canWork } from '../sim/crew.js';
import { weaponType, armorType } from '../sim/equipment.js';
import { WEAPONS } from '../data/items.js';
import { drag } from '../ui/dragState.js';

export const hits = { slots: [], survivors: [], wagons: [] };
// Emplacements des réparateurs (part de la largeur du wagon), entre les couchettes et les postes
const REPAIR_X = [0.53, 0.14, 0.88, 0.3];

function slotRing(ctx, x, y, r, mode) {
  ctx.save();
  ctx.lineWidth = 2;
  if (mode === 'valid') {
    ctx.fillStyle = 'rgba(126,200,120,0.35)';
    ctx.strokeStyle = '#8fd17e';
  } else if (mode === 'hover') {
    ctx.fillStyle = 'rgba(232,163,61,0.45)';
    ctx.strokeStyle = '#E8A33D';
  } else {
    ctx.fillStyle = 'rgba(237,230,214,0.12)';
    ctx.strokeStyle = 'rgba(237,230,214,0.7)';
    ctx.setLineDash([3, 3]);
  }
  ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.38, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
}

// Wagon en panne : clé à molette qui clignote au-dessus, et jauge de réparation (repairT de 0 à 1)
function brokenBadge(ctx, x, y, S, time, w) {
  const r = 13 * Math.max(0.7, S);
  const pulse = 0.75 + 0.25 * Math.sin(time * 6);
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#C8382D';
  ctx.strokeStyle = '#2B2A33';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y - r, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#EDE6D6';
  ctx.lineWidth = Math.max(2, r * 0.22);
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - r * 0.45, y - r + r * 0.45); ctx.lineTo(x + r * 0.2, y - r - r * 0.2); ctx.stroke();
  ctx.beginPath(); ctx.arc(x + r * 0.3, y - r - r * 0.3, r * 0.28, Math.PI * 0.75, Math.PI * 2.25); ctx.stroke();
  if (w.repairT > 0) {
    ctx.strokeStyle = '#8fd17e';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y - r, r + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, w.repairT)); ctx.stroke();
  }
  ctx.restore();
}

// Équipement et posture de combat d'un survivant (s'il vient de frapper)
function gearOf(state, s) {
  return { weapon: weaponType(state, s), armor: armorType(state, s) };
}
function fighting(state, s) {
  return s.fightT !== undefined && state.time - s.fightT < 0.4;
}
const fightPose = (gear) => (WEAPONS[gear.weapon] && WEAPONS[gear.weapon].range > 0 ? 'shoot' : 'strike');

export function drawCrew(ctx, state, cars, view, time) {
  const { S } = view;
  hits.slots.length = 0;
  hits.survivors.length = 0;
  hits.wagons.length = 0;
  const scale = S;
  const dragging = drag.active ? drag.survivor : null;
  const byPost = new Map();
  for (const s of state.crew) if (s.post) byPost.set(s.post.wagon + ':' + s.post.slot, s);
  const resting = restingPlaces(state);
  const restByWagon = new Map();
  for (const r of resting) {
    if (!r.place) continue;
    const key = r.place.wagon;
    if (!restByWagon.has(key)) restByWagon.set(key, []);
    restByWagon.get(key).push(r);
  }

  for (const car of cars) {
    const f = carFrame(car, view);
    if (f.x > view.W + 40 || f.x + f.w < -40) continue;

    // Locomotive : deux places de repos dans la cabine
    if (car.kind === 'loco') {
      const rs = restByWagon.get('loco') || [];
      rs.forEach((r, i) => {
        if (r.s === dragging) return;
        const px = f.x + (0.13 + i * 0.08) * f.w, py = f.top + 0.7 * (f.bottom - f.top);
        drawPuppet(ctx, r.s, px, py, scale * 0.8, r.s.state === 'critical' ? 'critical' : r.s.state === 'injured' ? 'injured' : 'doze', time, false);
        hits.survivors.push({ s: r.s, x: px, y: py - PUPPET_HEIGHT * scale * 0.4, r: 14 * scale });
      });
      continue;
    }

    const w = car.wagon;
    const def = WAGONS[w.type] || {};
    const floorY = f.top + car.meta.floor * S;
    hits.wagons.push({ wagon: w, x0: f.x, x1: f.x + f.w, top: f.top, bottom: f.bottom });
    if (w.broken) {
      // Pendant un glisser : les wagons en panne s'allument comme cibles de réparation
      if (drag.active && dragging && canWork(dragging)) {
        const hov = drag.hoverRepair === w;
        ctx.save();
        ctx.fillStyle = hov ? 'rgba(232,163,61,0.28)' : 'rgba(232,163,61,0.10)';
        ctx.strokeStyle = '#E8A33D';
        ctx.lineWidth = hov ? 3 : 1.5;
        if (!hov) ctx.setLineDash([6, 5]);
        ctx.beginPath(); ctx.roundRect(f.x + 4, f.top + 4, f.w - 8, f.bottom - f.top - 8, 8); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      brokenBadge(ctx, f.x + f.w / 2, f.top - 4 * S, S, time, w);
    }
    // Pendant un glisser : le wagon visé s'allume (on peut lâcher n'importe où dessus)
    if (drag.active && drag.hoverSlot && drag.hoverSlot.wagon === w) {
      ctx.save();
      ctx.fillStyle = 'rgba(126,200,120,0.18)';
      ctx.strokeStyle = '#8fd17e';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.roundRect(f.x + 4, f.top + 4, f.w - 8, f.bottom - f.top - 8, 8); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    // Pendant un glisser : les wagons attaqués s'allument en rouge (renfort)
    if (w.attacked && !w.broken && drag.active && dragging && canWork(dragging)) {
      const hov = drag.hoverDefend === w;
      ctx.save();
      ctx.strokeStyle = '#ff5a4a';
      ctx.fillStyle = hov ? 'rgba(200,56,45,0.25)' : 'rgba(200,56,45,0.08)';
      ctx.lineWidth = hov ? 3 : 1.5;
      if (!hov) ctx.setLineDash([6, 5]);
      ctx.beginPath(); ctx.roundRect(f.x + 4, f.top + 4, f.w - 8, f.bottom - f.top - 8, 8); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    // Survivants envoyés réparer ou défendre ce wagon : au milieu du plancher
    const extras = state.crew.filter(s => s.post && s.post.wagon === w.id && (s.post.slot === 'repair' || s.post.slot === 'defend') && s !== dragging);
    extras.forEach((s, i) => {
      const fx = REPAIR_X[i % REPAIR_X.length];
      const px = f.x + fx * f.w, py = floorY;
      const gear = gearOf(state, s);
      const pose = s.post.slot === 'repair' ? 'hammer' : fighting(state, s) ? fightPose(gear) : 'stand';
      drawPuppet(ctx, s, px, py, scale, pose, time + i * 0.37, s.post.slot === 'repair' && i % 2 === 1, gear);
      hits.survivors.push({ s, x: px, y: py - PUPPET_HEIGHT * scale * 0.5, r: 16 * scale });
    });

    // Couchettes du toit
    const roofRs = (restByWagon.get(w.id) || []).filter(r => r.place.roof);
    if (w.berths) {
      if (drag.active && drag.hoverBunk === w && !def.beds) {
        ctx.fillStyle = 'rgba(126,200,120,0.3)';
        ctx.strokeStyle = '#8fd17e';
        ctx.lineWidth = 2;
        const sp = berthSpots(car, f, S), x0 = sp[0].x - 0.1 * f.w, x1 = sp[sp.length - 1].x + 0.1 * f.w;
        ctx.beginPath(); ctx.roundRect(x0, sp[0].y - 24 * S, x1 - x0, 32 * S, 6); ctx.fill(); ctx.stroke();
      }
      const spots = berthSpots(car, f, S);
      roofRs.forEach((r, i) => {
        if (r.s === dragging) return;
        const sp = spots[i % spots.length];
        const px = sp.x, py = sp.y;
        const pose = r.s.state === 'critical' ? 'critical' : 'sleep';
        drawPuppet(ctx, r.s, px, py - 4 * S, scale * 0.95, pose, time, false);
        hits.survivors.push({ s: r.s, x: px, y: py - 6 * S, r: 18 * scale });
      });
    }

    // Couchages du Dormoir
    if (def.beds) {
      if (drag.active && drag.hoverBunk === w) {
        ctx.fillStyle = 'rgba(126,200,120,0.25)';
        ctx.strokeStyle = '#8fd17e';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(f.x + 4, f.top + 4, f.w - 8, f.bottom - f.top - 8, 8); ctx.fill(); ctx.stroke();
      }
      const rs = (restByWagon.get(w.id) || []).filter(r => !r.place.roof);
      rs.forEach((r, i) => {
        const pos = def.bedPos[i % def.bedPos.length];
        if (!pos || r.s === dragging) return;
        const px = f.x + pos[0] * f.w, py = f.top + pos[1] * S;
        // Réveillé par une attaque : debout sur le plancher, il se bat
        if (fighting(state, r.s)) {
          const gear = gearOf(state, r.s);
          drawPuppet(ctx, r.s, px, floorY, scale, fightPose(gear), time, false, gear);
          hits.survivors.push({ s: r.s, x: px, y: floorY - PUPPET_HEIGHT * scale * 0.5, r: 16 * scale });
          return;
        }
        const pose = r.s.state === 'critical' ? 'critical' : 'sleep';
        drawPuppet(ctx, r.s, px, py - 4 * S, scale * 0.95, pose, time, false);
        hits.survivors.push({ s: r.s, x: px, y: py - 6 * S, r: 18 * scale });
      });
      continue;
    }

    // Postes de travail
    const n = slotCount(w);
    for (let i = 0; i < n; i++) {
      const fx = def.slotX ? def.slotX[i] : 0.3 + i * 0.2;
      const px = f.x + fx * f.w, py = floorY;
      const s = byPost.get(w.id + ':' + i);
      hits.slots.push({ wagon: w, slot: i, x: px, y: py - 18 * S, r: 22 * S, occupied: s });
      if (!s || s === dragging) {
        let mode = 'empty';
        if (drag.active && dragging && canWork(dragging)) mode = drag.hoverSlot && drag.hoverSlot.wagon === w && drag.hoverSlot.slot === i ? 'hover' : 'valid';
        slotRing(ctx, px, py - 1 * S, 9 * S, mode);
        continue;
      }
      if (drag.active && drag.hoverSlot && drag.hoverSlot.wagon === w && drag.hoverSlot.slot === i) {
        slotRing(ctx, px, py - 1 * S, 10 * S, 'hover');
      }
      const gear = gearOf(state, s);
      drawPuppet(ctx, s, px, py, scale, fighting(state, s) ? fightPose(gear) : def.anim || 'stand', time, false, gear);
      hits.survivors.push({ s, x: px, y: py - PUPPET_HEIGHT * scale * 0.5, r: 16 * scale });
    }
  }

  // Survivants critiques sans couchage (cas extrême) : rien à dessiner, ils restent dans le bandeau
}

// Recherche du poste ou du wagon sous un point (coordonnées de la scène)
export function slotAt(x, y) {
  let best = null, bd = Infinity;
  for (const h of hits.slots) {
    const d = Math.hypot(h.x - x, (h.y - y) * 0.7);
    if (d < h.r * 1.6 && d < bd) { best = h; bd = d; }
  }
  return best;
}

export function survivorAt(x, y) {
  let best = null, bd = Infinity;
  for (const h of hits.survivors) {
    const d = Math.hypot(h.x - x, h.y - y);
    if (d < h.r * 1.3 && d < bd) { best = h; bd = d; }
  }
  return best;
}

export function wagonAt(x, y) {
  return hits.wagons.find(h => x >= h.x0 && x <= h.x1 && y >= h.top - 10 && y <= h.bottom + 10) || null;
}
