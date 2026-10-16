// Carte du circuit (GDD §3.2, §14.10) : l'anneau dessiné comme une vraie voie ferrée en boucle.
// Le dépôt est en bas ; les 6 tronçons font le tour dans le sens inverse des aiguilles d'une montre (départ vers la droite). À chaque tronçon,
// les embranchements se séparent à l'aiguillage et se rejoignent au suivant (la voie par défaut reste sur la
// boucle, les autres s'écartent vers l'extérieur ou l'intérieur). Toucher une voie affiche son détail à droite.
import { t } from '../core/i18n.js';
import { el } from './modal.js';
import { icon } from './icons.js';
import { openPanel, refreshPanel } from './panels.js';
import { toast, buzz } from './toasts.js';
import { getCircuit } from '../data/circuits.js';
import { SITE_TYPES, CAMP_TYPES, ATTITUDE_COLORS } from '../data/sites.js';
import { junctionPos, nextLegIndex, setChoice, unlockBranch } from '../sim/route.js';
import { fxOn } from '../sim/research.js';

// ---------- Géométrie de la boucle (unités du viewBox) ----------
const W = 1000, H = 440;
const CX = 500, CY = 220, HALF = 272, R = 138;      // stade : deux droites de 544, deux demi-cercles de rayon 138
const OFF = 58;                                       // écart entre deux voies parallèles
const SEG = [HALF, Math.PI * R, 2 * HALF, Math.PI * R, HALF];
const P = SEG.reduce((a, b) => a + b, 0);

// Point de la boucle et normale extérieure, pour t ∈ [0, 1) (0 = dépôt, en bas au centre, puis vers la droite :
// le train roule vers la droite dans la scène, il part donc vers la droite sur la carte aussi)
function loop(t) {
  const p = loopLeft(t);
  return { x: 2 * CX - p.x, y: p.y, nx: -p.nx, ny: p.ny };
}

// Tracé de base (vers la gauche), retourné par loop()
function loopLeft(t) {
  let s = ((t % 1) + 1) % 1 * P;
  if (s < SEG[0]) return { x: CX - s, y: CY + R, nx: 0, ny: 1 };
  s -= SEG[0];
  if (s < SEG[1]) {                                   // demi-cercle gauche, du bas vers le haut
    const a = Math.PI / 2 + s / R;
    const c = { x: CX - HALF, y: CY };
    return { x: c.x + Math.cos(a) * R, y: c.y + Math.sin(a) * R, nx: Math.cos(a), ny: Math.sin(a) };
  }
  s -= SEG[1];
  if (s < SEG[2]) return { x: CX - HALF + s, y: CY - R, nx: 0, ny: -1 };
  s -= SEG[2];
  if (s < SEG[3]) {                                   // demi-cercle droit, du haut vers le bas
    const a = -Math.PI / 2 + s / R;
    const c = { x: CX + HALF, y: CY };
    return { x: c.x + Math.cos(a) * R, y: c.y + Math.sin(a) * R, nx: Math.cos(a), ny: Math.sin(a) };
  }
  s -= SEG[3];
  return { x: CX + HALF - s, y: CY + R, nx: 0, ny: 1 };
}

const smooth = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
// Écart d'une voie le long de son tronçon : elle quitte la boucle à l'aiguillage et la rejoint au suivant
const bump = u => (u < 0.2 ? smooth(u / 0.2) : u > 0.8 ? smooth((1 - u) / 0.2) : 1);

function branchPoint(t0, t1, off, u) {
  const p = loop(t0 + (t1 - t0) * u);
  const d = off * OFF * bump(u);
  return { x: p.x + p.nx * d, y: p.y + p.ny * d, nx: p.nx, ny: p.ny };
}

function branchPath(t0, t1, off) {
  const pts = [];
  for (let i = 0; i <= 48; i++) pts.push(branchPoint(t0, t1, off, i / 48));
  return 'M' + pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L');
}

// Voie par défaut sur la boucle, les autres en alternance : dehors, dedans, plus loin dehors…
function offsets(leg) {
  const out = {};
  let k = 0;
  out[leg.defaultBranch] = 0;
  for (const b of leg.branches) {
    if (b.id === leg.defaultBranch) continue;
    k += 1;
    out[b.id] = k % 2 ? Math.ceil(k / 2) : -Math.ceil(k / 2);
  }
  return out;
}

const pct = (v, total) => (v / total * 100).toFixed(2) + '%';
const svgEl = (tag, attrs) => {
  const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
};

let selected = null;      // embranchement dont on lit le détail

// ---------- Détail d'un site ----------
function siteLine(state, s, known) {
  const st = state.world.sites[s.id];
  const ico = el('span', { class: 'map-dico' });
  // Cartographie (recherche) : le type des arrêts d'une voie inconnue est visible, pas leur nom
  const mapped = !known && fxOn(state, 'mapping');
  ico.innerHTML = icon(known || mapped ? 'site_' + s.type : 'question');
  let info = mapped ? (s.type === 'camp' ? t('camp.' + s.camp) : t('site.' + s.type)) : '';
  if (known && st && st.lastSeen) {
    if (s.type === 'camp') {
      const att = st.lastSeen.attitude || st.attitude;
      info = `${t('camp.' + s.camp)} · ${t('attitude.' + att)}`;
    } else if (SITE_TYPES[s.type] && SITE_TYPES[s.type].yield) info = t('map.stockSeen', { v: Math.round((st.lastSeen.stock ?? 1) * 100) });
    else info = t('site.' + s.type);
  } else if (known) info = s.type === 'camp' ? t('camp.' + s.camp) : t('site.' + s.type);
  if (s.type === 'station' && st && st.contract && st.contract.accepted) info += ' · ' + t('contract.due', { lap: st.contract.deadline });
  return el('div', { class: 'ledger-row' }, ico,
    el('div', { class: 'ledger-text' }, el('strong', { text: known ? s.name : t('map.unknownSite') }), el('span', { class: 'muted', text: info })));
}

function details(getState, state, leg, li, b) {
  const r = state.route;
  const bs = state.world.branches[b.id] || {};
  const box = el('div', { class: 'map-detail' });
  const here = r.mode !== 'depot' && r.leg === li && r.branch === b.id;
  const nextLi = nextLegIndex(state);
  const chosen = li === nextLi && r.nextChoice === b.id;
  const head = el('div', { class: 'map-dhead' },
    el('strong', { text: bs.known ? b.name : t('map.unknownBranch') }),
    el('span', { class: 'muted small', text: t('map.legLong', { n: li + 1 }) + (b.id === leg.defaultBranch ? ' · ' + t('map.default') : '') }));
  box.appendChild(head);
  const tags = el('div', { class: 'map-tags' });
  if (here) tags.appendChild(el('span', { class: 'map-tag', text: t('map.here') }));
  if (chosen) tags.appendChild(el('span', { class: 'map-tag chosen', text: t('map.chosen') }));
  if (!bs.known) tags.appendChild(el('span', { class: 'map-tag sig sig-' + b.signal, text: t('signal.' + b.signal) }));
  if (!bs.unlocked) tags.appendChild(el('span', { class: 'map-tag lock', text: t('map.lockedN', { n: b.lockCost }) }));
  if (b.traverseTo) tags.appendChild(el('span', { class: 'map-tag', text: t('map.traverse', { n: b.traverseTo }) }));
  if (tags.childNodes.length) box.appendChild(tags);
  const list = el('div', { class: 'ledger' });
  b.sites.forEach(s => list.appendChild(siteLine(state, s, bs.known)));
  box.appendChild(list);
  // Actions possibles depuis la carte : choisir la voie du prochain aiguillage, ou l'ouvrir
  if (li === nextLi && nextLi < r.legs) {
    if (!bs.unlocked) {
      const ok = (state.resources.keys || 0) >= b.lockCost;
      const btn = el('button', { class: 'btn btn-small', type: 'button', disabled: ok ? null : 'disabled', text: t('map.unlock', { n: b.lockCost }) });
      btn.addEventListener('click', () => {
        const s2 = getState();
        if (unlockBranch(s2, b.id).ok) { setChoice(s2, b.id); toast(t('switch.unlocked', { name: b.name })); buzz([15, 30, 15]); refreshPanel(true); }
      });
      box.appendChild(btn);
    } else if (!chosen) {
      const btn = el('button', { class: 'btn btn-small btn-primary', type: 'button', text: t('map.take') });
      btn.addEventListener('click', () => { if (setChoice(getState(), b.id)) { buzz(15); refreshPanel(true); } });
      box.appendChild(btn);
    }
  }
  return box;
}

export function openMap(getState) {
  selected = null;
  openPanel('', () => {
    const state = getState();
    const r = state.route;
    const circuit = getCircuit(r.ring);
    const n = circuit.legs.length;
    // Par défaut : la voie où roule le train, sinon celle choisie pour le prochain aiguillage
    if (!selected) selected = r.mode !== 'depot' ? r.branch : r.nextChoice;

    const map = el('div', { class: 'rail-map' });
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'rail-svg', 'aria-hidden': 'true' });
    const layers = { bed: svgEl('g', {}), ties: svgEl('g', {}), rails: svgEl('g', {}), hit: svgEl('g', {}) };
    Object.values(layers).forEach(g => svg.appendChild(g));
    const overlay = el('div', { class: 'rail-overlay' });

    circuit.legs.forEach((leg, li) => {
      const t0 = li / n, t1 = (li + 1) / n;
      const offs = offsets(leg);
      const nextLi = nextLegIndex(state);
      for (const b of leg.branches) {
        const bs = state.world.branches[b.id] || {};
        const d = branchPath(t0, t1, offs[b.id]);
        const here = r.mode !== 'depot' && r.leg === li && r.branch === b.id;
        const chosen = li === nextLi && r.nextChoice === b.id;
        const cls = ['track', bs.known ? 'known' : 'fog', bs.unlocked ? '' : 'locked', here ? 'here' : '', chosen ? 'chosen' : '', selected === b.id ? 'sel' : ''].join(' ');
        layers.bed.appendChild(svgEl('path', { d, class: 'tk-bed ' + cls }));
        layers.ties.appendChild(svgEl('path', { d, class: 'tk-ties ' + cls }));
        layers.rails.appendChild(svgEl('path', { d, class: 'tk-rails ' + cls }));
        layers.rails.appendChild(svgEl('path', { d, class: 'tk-gap ' + cls }));
        const hit = svgEl('path', { d, class: 'tk-hit' });
        hit.addEventListener('click', () => { selected = b.id; buzz(8); refreshPanel(true); });
        layers.hit.appendChild(hit);
        // Arrêts le long de la voie
        b.sites.forEach((s, k) => {
          const p = branchPoint(t0, t1, offs[b.id], (k + 1) / (b.sites.length + 1));
          const st = state.world.sites[s.id];
          const mk = el('button', { class: 'rail-stop' + (bs.known ? '' : ' fog') + (selected === b.id ? ' sel' : ''), type: 'button',
            title: bs.known ? s.name : t('map.unknownSite') });
          mk.style.left = pct(p.x, W); mk.style.top = pct(p.y, H);
          mk.innerHTML = icon(bs.known || fxOn(state, 'mapping') ? 'site_' + s.type : 'question');
          if (bs.known && st && s.type === 'camp') {
            const dot = el('i', { class: 'rail-att' });
            dot.style.background = ATTITUDE_COLORS[(st.lastSeen && st.lastSeen.attitude) || st.attitude || CAMP_TYPES[s.camp].attitude];
            mk.appendChild(dot);
          }
          if (s.type === 'station' && st && st.contract && st.contract.accepted) mk.appendChild(el('i', { class: 'map-contract', text: t('map.contractLap', { n: st.contract.deadline }) }));
          mk.addEventListener('click', () => { selected = b.id; buzz(8); refreshPanel(true); });
          overlay.appendChild(mk);
        });
        // Cadenas ou feu au milieu des voies fermées ou inconnues
        if (!bs.unlocked || !bs.known) {
          const p = branchPoint(t0, t1, offs[b.id], 0.5 / (b.sites.length + 1));
          const tag = el('span', { class: 'rail-flag' + (!bs.unlocked ? ' lock' : ' sig-' + b.signal) });
          tag.style.left = pct(p.x, W); tag.style.top = pct(p.y, H);
          if (!bs.unlocked) tag.innerHTML = icon('lock') + `<b>${b.lockCost}</b>`;
          overlay.appendChild(tag);
        }
      }
      // Aiguillage à la fin du tronçon (sauf le dernier : c'est le dépôt)
      if (li < n - 1) {
        const p = loop(t1);
        const j = el('span', { class: 'rail-junction', text: 'J' + (li + 1) });
        j.style.left = pct(p.x, W); j.style.top = pct(p.y, H);
        overlay.appendChild(j);
      }
    });

    // Dépôt
    const dp = loop(0);
    const depot = el('span', { class: 'rail-depot' + (r.mode === 'depot' ? ' here' : '') });
    depot.innerHTML = icon('site_depot') + `<b>${t('map.depot')}</b>`;
    depot.style.left = pct(dp.x, W); depot.style.top = pct(dp.y, H);
    overlay.appendChild(depot);

    // Le train
    let tp;
    if (r.mode === 'depot') { tp = loop(0); tp = { x: tp.x + 46, y: tp.y }; }
    else {
      const leg = circuit.legs[r.leg];
      const u = Math.max(0, Math.min(1, (r.distance - r.legStart) / Math.max(1, junctionPos(state) - r.legStart)));
      tp = branchPoint(r.leg / n, (r.leg + 1) / n, offsets(leg)[r.branch] || 0, u);
    }
    const train = el('span', { class: 'rail-train', title: t('map.here') });
    train.innerHTML = icon('train');
    train.style.left = pct(tp.x, W); train.style.top = pct(tp.y, H);
    overlay.appendChild(train);

    map.append(svg, overlay);
    // Détail de la voie choisie
    let side = el('p', { class: 'muted small', text: t('map.tapHint') });
    circuit.legs.forEach((leg, li) => {
      const b = leg.branches.find(x => x.id === selected);
      if (b) side = details(getState, state, leg, li, b);
    });
    const wrap = el('div', { class: 'map-wrap' }, map,
      el('div', { class: 'map-side' }, side, el('p', { class: 'muted map-legend', text: t('map.legend') })));
    return { el: wrap, title: t('map.title', { ring: circuit.name }) };
  }, { wide: true, tab: 'map' });
}
