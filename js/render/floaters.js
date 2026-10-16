// Textes flottants au-dessus du train (GDD §14.8) : ramassages, gains.
import { carFrame } from './train.js';

const list = [];

// anchor : type de wagon au-dessus duquel le texte apparaît (repli : milieu du train)
export function addFloater(text, color, anchor = 'gatherer') {
  const sameAnchor = list.filter(f => f.anchor === anchor && f.t < 0.5).length;
  list.push({ text, color, anchor, t: 0, offset: sameAnchor * 18 });
  if (list.length > 12) list.shift();
}

export function drawFloaters(ctx, dt, cars, view) {
  if (!list.length) return;
  const { S } = view;
  ctx.save();
  ctx.font = `800 ${Math.round(Math.max(12, 14 * Math.min(1.2, S)))}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  for (let i = list.length - 1; i >= 0; i--) {
    const f = list[i];
    f.t += dt;
    if (f.t > 2.2) { list.splice(i, 1); continue; }
    let car = typeof f.anchor === 'number' ? cars[f.anchor + 1] : cars.find(c => c.kind === 'wagon' && c.wagon.type === f.anchor);
    if (!car) car = cars[Math.floor(cars.length / 2)];
    const fr = carFrame(car, view);
    const x = fr.x + fr.w / 2;
    const y = fr.top - 12 - f.offset - f.t * 26;
    const a = f.t < 0.15 ? f.t / 0.15 : f.t > 1.6 ? Math.max(0, (2.2 - f.t) / 0.6) : 1;
    ctx.globalAlpha = a;
    ctx.strokeStyle = 'rgba(31,30,37,0.9)';
    ctx.lineWidth = 4;
    ctx.strokeText(f.text, x, y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, x, y);
  }
  ctx.restore();
}
