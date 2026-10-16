// Atelier du train (onglet Train, GDD §4) : locomotive, wagons (niveau, Grenier, place dans le convoi),
// construction de nouveaux wagons. Tout se fait en Halte, sauf le Grenier.
import { t, LOCALE } from '../core/i18n.js';
import { el } from './modal.js';
import { icon } from './icons.js';
import { openPanel, refreshPanel } from './panels.js';
import { toast, buzz } from './toasts.js';
import { costEl } from './stationPanel.js';
import { BUILD } from '../data/build.js';
import { WAGONS, slotCount, bedCount } from '../data/wagons.js';
import { BALANCE } from '../data/balance.js';
import { isHalte } from '../sim/route.js';
import { maxIntegrity } from '../sim/combat.js';
import { bedsTotal } from '../sim/crew.js';
import { zoneMax } from '../sim/zones.js';
import { ZONES } from '../data/zones.js';
import { inSentence } from './zoneUI.js';
import {
  traction, lockReason, buildCost, canBuild, buildWagon, upgradeCost, canUpgrade, upgradeWagon,
  atticCost, canAttic, buyAttic, berthsCost, canBerths, buyBerths, roofTurretCost, canRoofTurret, buyRoofTurret, roofModule, roofTurretCount, moveWagon, canMoveWagon, hasRoof, canDismantle, dismantleWagon, dismantleRefund, canDismantleRoof, dismantleRoof, roofRefund, nextLoco, canUpgradeLoco, upgradeLoco
} from '../sim/build.js';
import {
  caboose, cabooseMax, canBuildCaboose, buildCaboose, cabooseUpCost, canUpgradeCaboose, upgradeCaboose,
  cabooseRepairCost, canRepairCaboose, repairCaboose
} from '../sim/caboose.js';

const REASON = { halte: 'build.needHalte', cost: 'build.needCost', traction: 'build.full', loco: 'build.needT2', max: 'build.max', unique: 'build.unique', noRoof: 'train.noRoof', fixed: 'train.fixed', beds: 'train.dismantleBeds', combat: 'train.dismantleCombat', zoneCap: 'build.zoneCap', zone: 'train.locoZone' };

function feedback(res, okText) {
  if (res.ok) { if (okText) toast(okText); buzz([15, 30, 15]); }
  else if (REASON[res.reason]) toast(t(REASON[res.reason]), 'warn');
}

function dot(type) {
  const d = el('span', { class: 'wagon-dot' });
  d.style.background = (WAGONS[type] || {}).color || '#888';
  return d;
}

function cabooseSection(getState, state) {
  const cb = caboose(state);
  const wrap = el('div', { class: 'caboose-box tr-detail' }, el('div', { class: 'tr-dhead' }, el('strong', { text: t('train.caboose') })));
  wrap.appendChild(el('p', { class: 'muted small', text: t('train.cabooseDesc') }));
  const btn = (label, cost, check, act, okText) => {
    const b = el('button', { class: 'btn btn-small' + (cb ? '' : ' btn-primary'), type: 'button', disabled: check.ok ? null : 'disabled',
      title: check.reason ? t(REASON[check.reason] || 'build.needCost') : '' }, document.createTextNode(label + ' '), costEl(cost));
    b.addEventListener('click', () => feedback(act(getState()), okText()));
    return b;
  };
  if (!cb) {
    wrap.appendChild(el('div', { class: 'build-row' }, dot('caboose'),
      el('div', { class: 'build-text' }, el('strong', { text: t('wagon.caboose') }),
        el('span', { class: 'muted', text: t('train.cabooseHp', { l: 1, hp: BUILD.caboose.hp[0], max: BUILD.caboose.hp[0], n: WAGONS.caboose.slots[0] }) })),
      el('div', { class: 'build-actions' },
        btn(t('train.cabooseBuild'), BUILD.caboose.cost, canBuildCaboose(state), buildCaboose, () => t('train.cabooseBuilt')))));
    // Pourquoi on ne peut pas (sur téléphone, l'infobulle du bouton ne se voit pas)
    const why = canBuildCaboose(state);
    if (!why.ok) wrap.appendChild(el('p', { class: 'warn-text small', text: t(REASON[why.reason] || 'build.needCost') }));
    return wrap;
  }
  const max = cabooseMax(cb);
  const actions = el('div', { class: 'build-actions' });
  const rc = cabooseRepairCost(state);
  if (rc) actions.appendChild(btn(t('train.cabooseRepair'), rc, canRepairCaboose(state), repairCaboose, () => t('train.cabooseRepaired')));
  const uc = cabooseUpCost(state);
  if (uc) actions.appendChild(btn(t('train.upgrade', { n: cb.level + 1 }), uc, canUpgradeCaboose(state), upgradeCaboose,
    () => t('train.cabooseUpDone', { n: caboose(getState()).level })));
  wrap.appendChild(el('div', { class: 'build-row' }, dot('caboose'),
    el('div', { class: 'build-text' }, el('strong', { text: t('wagon.caboose') }),
      el('span', { class: cb.breached ? 'warn-text' : 'muted', text: t('train.cabooseHp', { l: cb.level, hp: Math.floor(cb.hp), max, n: slotCount(cb) }) })),
    actions));
  if (cb.breached) wrap.appendChild(el('p', { class: 'warn-text small', text: t('train.cabooseBreached', { p: Math.round(BUILD.caboose.holdAt * 100) }) }));
  return wrap;
}

// ---------- Atelier du train : le convoi en vignettes, puis le détail de la voiture choisie ----------
let sel = null;     // 'loco' | id de wagon | 'caboose' | 'build'

function tile(kind, label, sub, color, selected, onClick, extra = []) {
  const b = el('button', { class: 'tr-tile ' + kind + (selected ? ' sel' : ''), type: 'button' },
    el('span', { class: 'tr-band' }), el('strong', { text: label }), el('span', { class: 'tr-sub', text: sub }), ...extra);
  if (color) b.querySelector('.tr-band').style.background = color;
  b.addEventListener('click', onClick);
  return b;
}

function chevrons(level) {
  return '▲'.repeat(Math.max(0, level - 1));
}

function locoDetail(getState, state) {
  const L = BUILD.locos[state.train.loco];
  const next = nextLoco(state);
  const box = el('div', { class: 'tr-detail' },
    el('div', { class: 'tr-dhead' }, el('strong', { text: t('loco.' + state.train.loco) + ' · T' + state.train.loco })),
    el('p', { class: 'muted', text: t('train.locoStats', {
      n: state.train.wagons.length, max: L.traction, v: BALANCE.locoSpeed[state.train.loco].toLocaleString(LOCALE),
      a: L.armor, i: maxIntegrity(state) }) }));
  if (next) {
    const c = canUpgradeLoco(state);
    const b = el('button', { class: 'btn btn-primary', type: 'button', disabled: c.ok ? null : 'disabled' },
      document.createTextNode(t('train.locoUp', { n: state.train.loco + 1 }) + ' '), costEl(next.cost));
    if (c.reason === 'research') b.title = t('build.needResearch');
    if (c.reason === 'zone') b.title = t('train.locoZone');
    b.addEventListener('click', () => feedback(upgradeLoco(getState()), t('train.locoDone', { name: t('loco.' + getState().train.loco) })));
    box.append(el('p', { class: 'muted small', text: t('train.locoNext', { name: t('loco.' + (state.train.loco + 1)) }) }), el('div', { class: 'tr-actions' }, b));
    if (c.reason === 'research') box.appendChild(el('p', { class: 'muted small', text: t('build.needResearchName', { name: t('research.' + next.research) }) }));
    if (c.reason === 'zone') box.appendChild(el('p', { class: 'muted small', text: t('train.locoZoneLong', { zone: inSentence((ZONES[next.zone] || {}).name || '') }) }));
  }
  return box;
}

// Démantèlement : deux touchers (le premier arme le bouton pendant 3 s)
let armed = { key: null, until: 0 };
function dangerButton(key, label, refund, check, act) {
  const on = armed.key === key && Date.now() < armed.until;
  const b = el('button', { class: 'btn btn-small btn-danger', type: 'button', disabled: check.ok ? null : 'disabled',
    title: check.reason ? t(REASON[check.reason] || 'build.needCost') : '' },
    document.createTextNode((on ? t('train.confirm') : label) + ' '), on ? null : costEl(refund, 'refund'));
  b.addEventListener('click', () => {
    if (armed.key === key && Date.now() < armed.until) { armed = { key: null, until: 0 }; act(); return; }
    armed = { key, until: Date.now() + 3000 };
    buzz(8);
    refreshPanel(true);
    setTimeout(() => refreshPanel(true), 3100);
  });
  return b;
}

// Nom de la zone qui débloque le palier suivant
function nextZoneName(state) {
  const z = ZONES[zoneMax(state) + 1];
  return z ? z.name : '';
}

function wagonDetail(getState, state, w, i, halte, onSheet) {
  let capNote = null;
  const def = WAGONS[w.type];
  const info = [def.skill ? t('sheet.slots', { n: slotCount(w) }) : '', bedCount(w) ? t('sheet.beds', { n: bedCount(w) }) : '',
    def.power ? t('train.powerUse', { p: def.power }) : ''].filter(Boolean).join(' · ');
  const box = el('div', { class: 'tr-detail' },
    el('div', { class: 'tr-dhead' }, el('strong', { text: `${t('wagon.' + w.type)} · ${t('sheet.level', { n: w.level })}` }),
      el('span', { class: 'muted small', text: t('train.position', { n: i + 1 }) })),
    el('p', { class: 'wagon-desc small', text: t('wagon.desc.' + w.type) }),
    el('p', { class: 'muted', text: info + (w.attic ? ' · ' + t('train.hasAttic') : '') + (w.berths ? ' · ' + t('train.hasBerths') : '') + (w.roofTurret ? ' · ' + t('train.hasRoofTurret') : '') }));
  if (w.broken) box.appendChild(el('p', { class: 'warn-text small', text: t('train.broken') }));
  const actions = el('div', { class: 'tr-actions' });
  if (w.level < BUILD.maxLevel) {
    const up = canUpgrade(state, w);
    const b = el('button', { class: 'btn btn-small btn-primary', type: 'button', disabled: up.ok ? null : 'disabled', title: up.reason ? t(REASON[up.reason] || 'build.needCost') : '' },
      document.createTextNode(t('train.upgrade', { n: w.level + 1 }) + ' '), costEl(upgradeCost(state, w)));
    b.addEventListener('click', () => feedback(upgradeWagon(getState(), w), t('train.upgraded', { name: t('wagon.' + w.type), n: w.level })));
    actions.appendChild(b);
    if (up.reason === 'zoneCap') capNote = t('build.zoneCapLong', { n: w.level + 1, zone: nextZoneName(state) });
  }
  // Toit : Grenier (stockage), Couchettes (2 lits) ou Tourelle auto, au choix
  if (!roofModule(w) && hasRoof(w)) {
    const c2 = canBerths(state, w);
    const b2 = el('button', { class: 'btn btn-small', type: 'button', disabled: c2.ok ? null : 'disabled', title: t('train.berthsTip', { n: BUILD.berths.beds }) },
      document.createTextNode(t('train.berths') + ' '), costEl(berthsCost(state)));
    b2.addEventListener('click', () => feedback(buyBerths(getState(), w), t('train.berthsDone')));
    const a = canAttic(state, w);
    const b3 = el('button', { class: 'btn btn-small', type: 'button', disabled: a.ok ? null : 'disabled', title: t('train.atticTip', { p: BUILD.attic.primary, s: BUILD.attic.secondary }) },
      document.createTextNode(t('train.attic') + ' '), costEl(atticCost(state)));
    b3.addEventListener('click', () => feedback(buyAttic(getState(), w), t('train.atticDone')));
    actions.append(b2, b3);
    // Tourelle auto : visible une fois la recherche faite
    const rt = canRoofTurret(state, w);
    if (rt.reason !== 'research') {
      const b4 = el('button', { class: 'btn btn-small', type: 'button', disabled: rt.ok ? null : 'disabled',
        title: rt.reason === 'max' ? t('train.roofTurretMax', { n: BUILD.roofTurret.max }) : t('train.roofTurretTip', { d: BUILD.roofTurret.dps, p: BUILD.roofTurret.power }) },
        document.createTextNode(t('train.roofTurret') + ' '), costEl(roofTurretCost(state)));
      b4.addEventListener('click', () => feedback(buyRoofTurret(getState(), w), t('train.roofTurretDone')));
      actions.append(b4);
    }
  }
  box.appendChild(actions);
  if (capNote) box.appendChild(el('p', { class: 'muted small', text: capNote }));
  if (!roofModule(w)) box.appendChild(el('p', { class: 'muted small', text: hasRoof(w) ? t('train.roofHint', { n: BUILD.berths.beds, p: BUILD.attic.primary })
    + (canRoofTurret(state, w).reason !== 'research' ? ' ' + t('train.roofTurretHint', { n: roofTurretCount(state), max: BUILD.roofTurret.max }) : '') : t('train.noRoof') }));
  if (w.type === BUILD.fixedFront) box.appendChild(el('p', { class: 'muted small', text: t('train.fixed') }));
  // Place dans le convoi, et fiche du wagon (qui y travaille)
  const foot = el('div', { class: 'tr-actions' });
  if (halte && w.type !== BUILD.fixedFront) {
    const mk = (dir, label) => {
      const b = el('button', { class: 'btn btn-small', type: 'button', text: label,
        disabled: canMoveWagon(state, w, dir) ? null : 'disabled' });
      b.addEventListener('click', () => { if (moveWagon(getState(), w, dir).ok) buzz(10); });
      return b;
    };
    foot.append(mk(1, '◀ ' + t('train.backward')), mk(-1, t('train.forward') + ' ▶'));
  }
  const sheetBtn = el('button', { class: 'btn btn-small btn-ghost', type: 'button', text: t('train.openSheet') });
  sheetBtn.addEventListener('click', () => onSheet && onSheet(w.id));
  foot.appendChild(sheetBtn);
  box.appendChild(foot);
  if (!halte) box.appendChild(el('p', { class: 'muted small', text: t('train.moveHalte') }));
  // Démanteler : le module de toit, ou le wagon entier (jamais la Chaudière)
  const danger = el('div', { class: 'tr-actions tr-danger' });
  if (roofModule(w)) {
    const name = t('train.' + roofModule(w));
    danger.appendChild(dangerButton('roof:' + w.id, t('train.dismantleRoof', { name }), roofRefund(w), canDismantleRoof(state, w), () => {
      const r = dismantleRoof(getState(), w);
      feedback(r, t('train.roofRemoved', { name }));
    }));
  }
  if (w.type !== BUILD.fixedFront) {
    danger.appendChild(dangerButton('wagon:' + w.id, t('train.dismantle'), dismantleRefund(w), canDismantle(state, w), () => {
      const r = dismantleWagon(getState(), w);
      feedback(r, t('train.dismantled', { name: t('wagon.' + w.type) }));
      if (r.ok) sel = 'build';
    }));
  }
  if (danger.childNodes.length) {
    box.appendChild(danger);
    box.appendChild(el('p', { class: 'muted small', text: t('train.dismantleHint', { p: Math.round(BUILD.refund * 100) }) }));
  }
  return box;
}

function buildDetail(getState, state) {
  const box = el('div', { class: 'tr-detail' },
    el('div', { class: 'tr-dhead' }, el('strong', { text: t('train.build') }),
      el('span', { class: 'muted small', text: t('train.wagons', { n: state.train.wagons.length, max: traction(state) }) })));
  if (state.train.wagons.length >= traction(state)) box.appendChild(el('p', { class: 'warn-text small', text: t('build.full') }));
  const grid = el('div', { class: 'build-grid' });
  for (const type of BUILD.order) {
    const lock = lockReason(state, type);
    const c = canBuild(state, type);
    const b = el('button', { class: 'build-card', type: 'button', disabled: c.ok ? null : 'disabled' },
      el('span', { class: 'build-card-head' }, dot(type), el('strong', { text: t('wagon.' + type) })),
      el('span', { class: 'muted small', text: lock ? t(lock.key, { n: lock.n, name: lock.id ? t('research.' + lock.id) : '' }) : c.reason === 'unique' ? t('build.unique') : t('build.desc.' + type) }),
      c.reason === 'unique' ? null : costEl(buildCost(state, type)));
    b.addEventListener('click', () => {
      const res = buildWagon(getState(), type);
      feedback(res, t('train.built', { name: t('wagon.' + type) }));
      if (res.ok) sel = res.wagon.id;
    });
    grid.appendChild(b);
  }
  box.appendChild(grid);
  return box;
}

export function openTrain(getState, { onWagonSheet, select = null } = {}) {
  sel = select;
  openPanel(t('train.title'), () => {
    const state = getState();
    const halte = isHalte(state);
    const wagons = state.train.wagons;
    if (!sel || (sel !== 'loco' && sel !== 'caboose' && sel !== 'build' && !wagons.some(w => w.id === sel))) sel = halte ? 'build' : 'loco';
    // Fourgon pas encore construit : sa fiche propose de le construire (elle renvoyait sur la locomotive)
    const box = el('div', { class: 'sheet train-panel' });
    box.appendChild(el('p', { class: halte ? 'gain-text small' : 'muted small', text: t(halte ? 'train.halte' : 'train.notHalte') + ' ' + t('train.bedsLine', { n: state.crew.length, beds: bedsTotal(state) }) }));

    // Le convoi, dans l'ordre de la scène : queue à gauche, locomotive à droite
    const strip = el('div', { class: 'tr-strip' });
    const pick = id => () => { sel = id; buzz(8); refreshPanel(true); };
    strip.appendChild(tile('add', '+', t('train.addTile'), null, sel === 'build', pick('build')));
    const cb = caboose(state);
    strip.appendChild(cb
      ? tile('car caboose' + (cb.breached ? ' warn' : ''), t('wagon.caboose'), chevrons(cb.level) + ' ' + Math.floor(cb.hp) + '/' + cabooseMax(cb), WAGONS.caboose.color, sel === 'caboose', pick('caboose'))
      : tile('car ghost', t('wagon.caboose'), t('train.notBuilt'), null, sel === 'caboose', pick('caboose')));
    for (let i = wagons.length - 1; i >= 0; i--) {
      const w = wagons[i];
      const badges = [];
      if (w.broken) badges.push(el('i', { class: 'tr-badge warn', text: '!' }));
      if (w.attic || w.berths) badges.push(el('i', { class: 'tr-badge', text: w.attic ? t('train.atticShort') : t('train.berthsShort') }));
      strip.appendChild(tile('car', t('wagon.' + w.type), chevrons(w.level) || t('train.lvl1'), WAGONS[w.type].color, sel === w.id, pick(w.id), badges));
    }
    strip.appendChild(tile('loco', t('loco.' + state.train.loco), 'T' + state.train.loco, '#b5562b', sel === 'loco', pick('loco')));
    box.appendChild(strip);

    // Détail
    if (sel === 'loco') box.appendChild(locoDetail(getState, state));
    else if (sel === 'caboose') box.appendChild(cabooseSection(getState, state));
    else if (sel === 'build') box.appendChild(buildDetail(getState, state));
    else {
      const i = wagons.findIndex(w => w.id === sel);
      box.appendChild(wagonDetail(getState, state, wagons[i], i, halte, onWagonSheet));
    }
    return { el: box };
  }, { wide: true, tab: 'train' });
}
