// Mini-carte du convoi, incrustée en bas de la scène (GDD §14.2) :
// un rectangle par voiture, cadre ambre = partie visible. Toucher = centrer la caméra.
import { WAGONS } from '../data/wagons.js';

let box = null;     // zone de la mini-carte à l'écran (pour les touchers)
let span = null;    // étendue du train en unités

export function drawMinimap(ctx, cars, { W, H, S, cx }) {
  if (!cars.length) return;
  const rear = cars[cars.length - 1].x0, front = cars[0].x1;
  const len = front - rear;
  const mapW = Math.min(W * 0.55, 30 + cars.length * 46);
  const mapH = 18;
  const x0 = (W - mapW) / 2, y0 = H - mapH - 6;
  box = { x: x0, y: y0 - 8, w: mapW, h: mapH + 14 };
  span = { rear, len };

  ctx.fillStyle = 'rgba(31,30,37,0.62)';
  ctx.beginPath(); ctx.roundRect(x0 - 4, y0 - 3, mapW + 8, mapH + 6, 6); ctx.fill();

  const k = mapW / len;
  for (const car of cars) {
    const cx0 = x0 + (car.x0 - rear) * k;
    const cw = Math.max(2, (car.x1 - car.x0) * k - 2);
    ctx.fillStyle = car.kind === 'loco' ? '#EDE6D6' : ((WAGONS[car.wagon.type] || {}).color || '#6E6A6F');
    ctx.beginPath();
    if (car.kind === 'loco') {
      ctx.moveTo(cx0, y0 + 3); ctx.lineTo(cx0 + cw - 4, y0 + 3); ctx.lineTo(cx0 + cw, y0 + mapH - 3);
      ctx.lineTo(cx0, y0 + mapH - 3); ctx.closePath();
    } else {
      ctx.roundRect(cx0, y0 + 4, cw, mapH - 8, 2);
    }
    ctx.fill();
  }

  // Partie visible
  const half = W / S / 2;
  const vx0 = x0 + Math.max(0, cx - half - rear) * k;
  const vx1 = x0 + Math.min(len, cx + half - rear) * k;
  ctx.strokeStyle = '#E8A33D';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(vx0, y0, Math.max(6, vx1 - vx0), mapH, 4); ctx.stroke();
}

// Renvoie la position (unités du train) touchée sur la mini-carte, ou null
export function minimapHit(px, py) {
  if (!box || !span) return null;
  if (px < box.x - 6 || px > box.x + box.w + 6 || py < box.y || py > box.y + box.h) return null;
  const f = Math.min(1, Math.max(0, (px - box.x) / box.w));
  return span.rear + f * span.len;
}
