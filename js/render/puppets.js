// Survivants dessinés par le code (GDD §15.2) : pantins à tête ronde, membres épais, contour sombre.
// Repère : (0, 0) = entre les pieds ; le pantin mesure 44 unités ; il regarde vers la droite.
import { LOOKS } from '../data/names.js';
import { drawCrewSprite } from './crewSprites.js';

const INK = '#2B2A33';
const H_LEG = 14, H_TORSO = 15, HEAD_R = 6.5;
const HIP = -H_LEG, SHOULDER = -H_LEG - H_TORSO, HEAD_Y = SHOULDER - HEAD_R - 1;

function limb(ctx, x1, y1, x2, y2, color, w = 3.6) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = w + 1.8;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}

// Bras articulé : angle de l'épaule et du coude (0 = vers le bas, positif = vers l'avant)
function arm(ctx, sx, sy, a1, a2, color, skin, tool) {
  const L = 7.5;
  const ex = sx + Math.sin(a1) * L, ey = sy + Math.cos(a1) * L;
  const hx = ex + Math.sin(a1 + a2) * L, hy = ey + Math.cos(a1 + a2) * L;
  limb(ctx, sx, sy, ex, ey, color);
  limb(ctx, ex, ey, hx, hy, color);
  ctx.fillStyle = skin;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(hx, hy, 1.9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  if (tool) tool(hx, hy, a1 + a2);
}

function hair(ctx, s, color) {
  const r = HEAD_R, y = HEAD_Y;
  ctx.fillStyle = color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  switch (s.look.style) {
    case 0: ctx.arc(0, y, r + 0.6, Math.PI * 1.05, Math.PI * 1.95); break;                    // court
    case 1: ctx.arc(0, y, r + 0.6, Math.PI, Math.PI * 2); ctx.moveTo(-3, y - r);             // chignon
      ctx.arc(-4.5, y - r + 0.5, 2.6, 0, Math.PI * 2); break;
    case 2: ctx.arc(0, y, r + 0.8, Math.PI * 0.9, Math.PI * 2); ctx.lineTo(-r - 1, y + 6);   // long
      ctx.lineTo(-r + 2, y + 6); break;
    case 3: ctx.arc(0, y, r + 0.3, Math.PI * 1.15, Math.PI * 1.85); break;                   // rasé
    case 4: for (let i = 0; i < 5; i++) {                                                    // bouclé
      const a = Math.PI * (1.05 + i * 0.22);
      ctx.moveTo(Math.cos(a) * r + 2, y + Math.sin(a) * r);
      ctx.arc(Math.cos(a) * r, y + Math.sin(a) * r, 2.2, 0, Math.PI * 2);
    } break;
    default: ctx.moveTo(-2, y - r + 1); ctx.lineTo(0, y - r - 4); ctx.lineTo(2.5, y - r + 1); // crête
  }
  ctx.fill();
  ctx.stroke();
}

function accessory(ctx, s) {
  const y = HEAD_Y, r = HEAD_R;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.1;
  switch (s.look.acc) {
    case 1: // lunettes de soudeur sur le front
      ctx.fillStyle = '#3a3238'; ctx.fillRect(-r, y - 3.5, r * 2, 1.6);
      ctx.fillStyle = '#E8A33D';
      ctx.beginPath(); ctx.arc(2, y - 3, 1.8, 0, Math.PI * 2); ctx.arc(5.5, y - 3, 1.8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      break;
    case 2: // foulard
      ctx.fillStyle = '#C8382D';
      ctx.beginPath(); ctx.moveTo(-4, SHOULDER - 1); ctx.lineTo(4, SHOULDER - 1); ctx.lineTo(1, SHOULDER + 3); ctx.closePath();
      ctx.fill(); ctx.stroke();
      break;
    case 3: // casquette
      ctx.fillStyle = '#5c6a82';
      ctx.beginPath(); ctx.arc(0, y - 0.5, r + 0.5, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillRect(2, y - 1.4, 6, 1.6);
      break;
    case 4: // casque
      ctx.fillStyle = '#E8A33D';
      ctx.beginPath(); ctx.arc(0, y - 0.5, r + 1, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
    default:
  }
}

function head(ctx, s, skin, hairColor) {
  ctx.fillStyle = skin;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(0, HEAD_Y, HEAD_R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  hair(ctx, s, hairColor);
  ctx.fillStyle = '#f4efe6';
  ctx.beginPath(); ctx.arc(3.4, HEAD_Y - 0.6, 1.25, 0, Math.PI * 2); ctx.fill();    // œil
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.arc(3.7, HEAD_Y - 0.6, 0.75, 0, Math.PI * 2); ctx.fill();
  accessory(ctx, s);
}

const shovelTool = (ctx) => (hx, hy, a) => {
  ctx.strokeStyle = '#7a5c40'; ctx.lineWidth = 1.6;
  const dx = Math.sin(a), dy = Math.cos(a);
  ctx.beginPath(); ctx.moveTo(hx - dx * 6, hy - dy * 6); ctx.lineTo(hx + dx * 7, hy + dy * 7); ctx.stroke();
  ctx.fillStyle = '#8c8287';
  ctx.beginPath(); ctx.ellipse(hx + dx * 8, hy + dy * 8, 2.2, 1.4, -a, 0, Math.PI * 2); ctx.fill();
};

// Armes tenues en main (dessinées seulement en combat)
const GUNS = { pistol: [7, 2.4, '#3a3238'], rifle: [15, 2.2, '#7a5c40'], shotgun: [12, 3, '#4a4247'], crossbow: [10, 2.2, '#7a5c40'] };
const BLADES = { knife: [5, '#c9c0c2'], pipe: [11, '#8c8287'], machete: [10, '#d8cfc2'], sledge: [12, '#7a5c40'], fists: [0, null] };
const weaponTool = (ctx, type) => (hx, hy, a) => {
  ctx.lineCap = 'round';
  if (GUNS[type]) {
    const [len, th, col] = GUNS[type];
    ctx.fillStyle = col; ctx.strokeStyle = INK; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.rect(hx - 2, hy - th, len, th); ctx.fill(); ctx.stroke();
    if (type === 'crossbow') { ctx.beginPath(); ctx.moveTo(hx + len - 2, hy - 6); ctx.lineTo(hx + len - 2, hy + 4); ctx.stroke(); }
    return;
  }
  const [len, col] = BLADES[type] || BLADES.pipe;
  if (!len) return;
  const dx = Math.sin(a), dy = Math.cos(a);
  ctx.strokeStyle = INK; ctx.lineWidth = 2.6;
  ctx.beginPath(); ctx.moveTo(hx - dx * 2, hy - dy * 2); ctx.lineTo(hx + dx * len, hy + dy * len); ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(hx - dx * 2, hy - dy * 2); ctx.lineTo(hx + dx * len, hy + dy * len); ctx.stroke();
  if (type === 'sledge') { ctx.fillStyle = '#6E6A6F'; ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.rect(hx + dx * len - 3, hy + dy * len - 3, 6, 6); ctx.fill(); ctx.stroke(); }
};

// Armures : par-dessus la tenue
const ARMOR_LOOK = { leather: '#7a4f32', scrapplate: '#8c8287', riot: '#2f3a4a', brutearmor: '#9a5530' };
function drawArmor(ctx, type) {
  const col = ARMOR_LOOK[type];
  if (!col) return;
  ctx.fillStyle = col; ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.roundRect(-5.5, SHOULDER - 0.5, 11, H_TORSO - 3, 3); ctx.fill(); ctx.stroke();
  if (type === 'leather') { ctx.beginPath(); ctx.moveTo(0, SHOULDER); ctx.lineTo(0, HIP - 3); ctx.stroke(); }
  else {
    ctx.fillStyle = 'rgba(237,230,214,0.5)';
    for (const [px, py] of [[-3, SHOULDER + 3], [3, SHOULDER + 3], [-3, SHOULDER + 8], [3, SHOULDER + 8]]) { ctx.beginPath(); ctx.arc(px, py, 0.8, 0, Math.PI * 2); ctx.fill(); }
    if (type !== 'scrapplate') { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(-5, SHOULDER + 1, 3, 2, 0, 0, Math.PI * 2); ctx.ellipse(5, SHOULDER + 1, 3, 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  }
}

// Dessin complet. pose : stand | shovel | water | sort | aim | hammer | read | carry | sleep | injured | critical
//                        | shoot | strike (combat) ; gear : { weapon, armor } (types d'objets)
export function drawPuppet(ctx, s, x, y, scale, pose, t, flip = false, gear = null) {
  if (drawCrewSprite(ctx, s, x, y, scale, pose, t, flip, gear)) return;   // planche dessinée si elle existe
  if (pose === 'doze') pose = 'injured';   // assoupi dans la cabine : le pantin s'assoit
  const skin = LOOKS.skin[s.look.skin], hairC = LOOKS.hair[s.look.hair], cloth = LOOKS.outfit[s.look.outfit];
  const ph = (parseInt(s.id.slice(1), 10) || 0) * 1.7;   // déphasage propre à chacun
  const k = t * 1 + ph;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip ? -scale : scale, scale);

  if (pose === 'sleep' || pose === 'critical') {
    ctx.rotate(-Math.PI / 2);
    ctx.translate(0, 21);
  }
  const breathe = pose === 'sleep' ? Math.sin(k * 1.5) * 0.4 : 0;

  // Jambes
  const stride = pose === 'carry' ? Math.sin(k * 10) * 2 : 0;
  const pants = '#4a4247';
  limb(ctx, -2, HIP, -2.5 - stride, 0, pants);
  limb(ctx, 2, HIP, 2.5 + stride, 0, pants);
  ctx.fillStyle = INK;
  ctx.fillRect(-4.5 - stride, -1.2, 4, 2.2);
  ctx.fillRect(1 + stride, -1.2, 4.5, 2.2);

  // Bras arrière
  let back = [0.15, 0.2], front = [0.25, 0.3], tool = null;
  switch (pose) {
    case 'shovel': { const a = 0.9 + Math.sin(k * 3.2) * 0.55; back = [a - 0.2, 0.3]; front = [a, 0.25]; tool = shovelTool(ctx); break; }
    case 'water': { back = [0.3, 0.4]; front = [1.2 + Math.sin(k * 1.2) * 0.15, 0.5]; break; }
    case 'sort': { back = [0.8 + Math.sin(k * 2.6) * 0.4, 0.5]; front = [0.9 + Math.sin(k * 2.6 + 2) * 0.4, 0.5]; break; }
    case 'aim': { back = [1.9, -0.3]; front = [2.1 + Math.sin(k * 7) * 0.04, -0.3]; break; }
    case 'hammer': { back = [0.7, 0.8]; front = [2.3 - Math.abs(Math.sin(k * 4)) * 1.6, 0.6]; break; }
    case 'read': { back = [0.9, 1.2]; front = [1.0, 1.25]; break; }
    case 'carry': { back = [2.6, 0.2]; front = [2.8, 0.2]; break; }
    case 'injured': { back = [0.1, 0.1]; front = [0.6, 1.4]; break; }
    case 'shoot': { back = [1.5, 0.1]; front = [1.6 + Math.sin(k * 9) * 0.05, 0]; if (gear) tool = weaponTool(ctx, gear.weapon); break; }
    case 'strike': { const sw = Math.abs(Math.sin(k * 5)); back = [0.9, 0.6]; front = [2.6 - sw * 1.9, 0.3]; if (gear) tool = weaponTool(ctx, gear.weapon); break; }
    default: { const sw = Math.sin(k * 1.4) * 0.08; back = [0.12 + sw, 0.15]; front = [0.2 - sw, 0.2]; }
  }
  const darker = '#3a3238';
  arm(ctx, -1.5, SHOULDER + 2, back[0], back[1], darker, skin, null);

  // Torse
  ctx.fillStyle = cloth;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.roundRect(-5, SHOULDER - breathe, 10, H_TORSO + 1 + breathe, 3.5); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(-5, HIP - 3, 10, 2.5);                        // ceinture
  if (gear && gear.armor && pose !== 'sleep' && pose !== 'critical') drawArmor(ctx, gear.armor);

  head(ctx, s, skin, hairC);

  // Bras avant (et outil)
  arm(ctx, 1.5, SHOULDER + 2, front[0], front[1], cloth, skin, tool);
  if (pose === 'read') {
    ctx.fillStyle = '#EDE6D6'; ctx.strokeStyle = INK; ctx.lineWidth = 1;
    ctx.fillRect(7, SHOULDER + 6, 6, 4.5); ctx.strokeRect(7, SHOULDER + 6, 6, 4.5);
  }
  if (pose === 'water') {
    ctx.fillStyle = '#3E8E8A'; ctx.strokeStyle = INK; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(9, SHOULDER + 7, 6, 4.5, 1); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

// Tête seule, pour les portraits de l'interface (cx, cy = centre ; r = rayon de la tête)
export function drawHead(ctx, s, cx, cy, r) {
  const k = r / HEAD_R;
  ctx.save();
  ctx.translate(cx, cy - HEAD_Y * k + 2 * k);
  ctx.scale(k, k);
  // épaules
  ctx.fillStyle = LOOKS.outfit[s.look.outfit];
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.roundRect(-8, SHOULDER + 1, 16, 10, 5); ctx.fill(); ctx.stroke();
  head(ctx, s, LOOKS.skin[s.look.skin], LOOKS.hair[s.look.hair]);
  ctx.restore();
}

export const PUPPET_HEIGHT = 44;
