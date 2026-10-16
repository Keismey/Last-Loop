// Fiches : survivant, wagon, liste de l'équipage (GDD §14.7).
import { carById } from '../sim/caboose.js';
import { t, num } from '../core/i18n.js';
import { el } from './modal.js';
import { icon } from './icons.js';
import { openPanel, closePanel } from './panels.js';
import { drawHead } from '../render/puppets.js';
import { drawCrewPortrait } from '../render/crewSprites.js';
import { WAGONS, slotCount, bedCount } from '../data/wagons.js';
import { BALANCE } from '../data/balance.js';
import { SKILLS, displayName, efficiency, unassign, workers, restingPlaces, bestBunkLevel, moraleFactors, moraleTarget, sortedSkills } from '../sim/crew.js';
import { harvestMultiplier } from '../sim/energy.js';
import { repairNow, canAutoRepair, repairRate, isHalte } from '../sim/route.js';
import { turretFire } from '../sim/combat.js';
import { setRecipe } from '../sim/build.js';
import { BUILD } from '../data/build.js';
import { COMBAT } from '../data/enemies.js';
import { toast } from './toasts.js';
import { gearSection, arsenalSection, craftSection, medkitButton } from './gearUI.js';
import { subTabs } from './subtabs.js';
import { CRAFT } from '../data/items.js';
import { canCraft } from '../sim/equipment.js';

const fmt1 = v => (Math.round(v * 10) / 10).toLocaleString('fr-FR');

export function portrait(s, size) {
  const c = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = size * dpr;
  c.height = size * dpr;
  c.style.width = size + 'px';
  c.style.height = size + 'px';
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  if (!drawCrewPortrait(g, s, size)) drawHead(g, s, size / 2, size / 2, size * 0.28);
  return c;
}

function bar(value, max, cls) {
  const b = el('div', { class: 'bar ' + (cls || '') });
  const f = el('div', { class: 'bar-fill' });
  f.style.width = Math.max(0, Math.min(100, (value / max) * 100)) + '%';
  b.appendChild(f);
  return b;
}

function wagonName(state, id) {
  const w = carById(state, id);
  return w ? t('wagon.' + w.type) : '';
}

export function statusText(state, s) {
  if (s.state === 'critical') return t('crew.critical') + ' · ' + (s.critical > 0 ? t('crew.criticalLeft', { s: Math.ceil(s.critical) }) : t('crew.holding'));
  if (s.state === 'injured') return t('crew.injured');
  if (s.post && s.post.slot === 'repair') return t('crew.repairing', { wagon: wagonName(state, s.post.wagon) });
  if (s.post && s.post.slot === 'defend') return t('crew.defending', { wagon: wagonName(state, s.post.wagon) });
  if (s.post) return t('crew.working', { wagon: wagonName(state, s.post.wagon) });
  return t('crew.resting');
}

// ---------- Fiche survivant ----------
export function openSurvivorSheet(getState, id, back = null, slide = null) {
  openPanel('', () => {
    const state = getState();
    const s = state.crew.find(x => x.id === id);
    if (!s) return null;
    const top = el('div', { class: 'sheet-top' },
      portrait(s, 84),
      el('div', { class: 'sheet-id' },
        el('p', { class: 'sheet-status', text: statusText(state, s) }),
        state.crew.length > 1 ? el('p', { class: 'sheet-nav muted small', text: t('sheet.swipe', { i: state.crew.indexOf(s) + 1, n: state.crew.length }) }) : null,
        el('div', { class: 'stat-row' }, el('span', { class: 'stat-ico', html: '' }), el('span', { text: t('sheet.hp') }),
          bar(s.hp, 100, 'bar-hp'), el('span', { class: 'num', text: Math.round(s.hp) })),
        el('div', { class: 'stat-row' }, el('span', { class: 'stat-ico' }), el('span', { text: t('sheet.morale') }),
          bar(s.morale, 100, 'bar-morale'), el('span', { class: 'num', text: Math.round(s.morale) }))));
    const icons = top.querySelectorAll('.stat-ico');
    icons[0].innerHTML = icon('heart');
    icons[1].innerHTML = icon('smile');

    // Sous-onglets : Équipement, Compétences
    const { bar: tabsBar, active } = subTabs('survivor', [
      { id: 'gear', label: t('gear.title'), icon: 'shield' },
      { id: 'skills', label: t('sheet.skills'), icon: 'star' }
    ], 'gear');
    // D'où vient le moral : une ligne courte, sous les jauges
    const mf = moraleFactors(state).map(f => t('morale.' + f.key) + ' ' + (f.key === 'base' ? f.v : (f.v > 0 ? '+' : '−') + Math.abs(f.v)));
    const moraleLine = el('p', { class: 'muted small morale-line', text: t('morale.line', { v: moraleTarget(state), list: mf.join(' · ') }) });
    const out = el('div', { class: 'sheet' }, top, moraleLine, medkitButton(getState, s));
    if (active === 'gear') out.appendChild(gearSection(getState, s));
    else out.appendChild(skillsSection(s));
    const foot = s.post ? el('button', {
      class: 'btn', type: 'button', text: t('sheet.unassign'),
      onclick: () => unassign(getState(), s)
    }) : null;
    return { el: out, tabs: tabsBar, foot, title: displayName(s) };
  }, { back, slide, onSwipe: dir => {
    // Survivant suivant ou précédent (dans l'ordre de l'équipage, en boucle)
    const crew = getState().crew;
    const i = crew.findIndex(x => x.id === id);
    if (crew.length < 2 || i < 0) return;
    const next = crew[(i + dir + crew.length) % crew.length];
    openSurvivorSheet(getState, next.id, back, dir > 0 ? 'next' : 'prev');
  } });
}

// Compétences : niveau, expérience, à quoi elles servent et efficacité au poste
function skillsSection(s) {
  const skills = el('div', { class: 'skills' },
    el('p', { class: 'muted skill-help', text: t('sheet.skillsHelp', { p: Math.round(BALANCE.crew.effPerSkill * 100) }) }));
  for (const k of SKILLS) {
    const next = BALANCE.crew.xpPerLevel * s.skills[k];
    const row = el('div', { class: 'skill-row' + (k === s.main ? ' main' : '') },
      el('span', { class: 'stat-ico' }),
      el('span', { class: 'skill-name', text: t('skill.' + k) }),
      el('span', { class: 'skill-lvl num', text: s.skills[k] }),
      bar(s.xp[k], next, 'bar-xp'));
    row.querySelector('.stat-ico').innerHTML = icon(k);
    skills.append(row, el('p', { class: 'skill-use',
      text: t('skill.use.' + k) + ' · ' + t('sheet.eff', { p: Math.round(efficiency(s, k) * 100) }) }));
  }
  return skills;
}

// ---------- Fiche wagon ----------
function effectText(state, w) {
  const def = WAGONS[w.type];
  const lv = 1 + BALANCE.energy.levelBonus * (w.level - 1);
  const sumEff = workers(state, w).reduce((a, x) => a + x.eff, 0);
  const factor = state.power ? state.power.factor : 1;
  switch (w.type) {
    case 'boiler': return t('effect.boiler', { v: fmt1(def.produce.powerBase + def.produce.powerPerWorker * sumEff * lv) });
    case 'greenhouse': return t('effect.greenhouse', { v: fmt1(def.produce.food * sumEff * lv * factor * 60) });
    case 'bunk': return t('effect.bunk', { v: BALANCE.crew.moralePerBunkLevel * w.level });
    case 'gatherer': return t('effect.gatherer', { v: fmt1(harvestMultiplier(state)) });
    case 'turret': { const f = turretFire(state, w); return t('effect.turret', { v: fmt1(f.dps), r: COMBAT.turretRange, a: fmt1(f.ammo) }); }
    case 'workshop': return w.recipe === 'ammo'
      ? t('effect.workshopAmmo', { v: fmt1(def.produce.ammo * sumEff * lv * factor * 60) })
      : t('effect.workshop', { v: fmt1(def.produce.parts * sumEff * lv * factor * 60) });
    case 'cargo': return t('effect.cargo', { v: BUILD.cargoCaps[w.level - 1], s: BUILD.cargoCaps[w.level - 1] / 2 });
    case 'lab': return t('effect.lab', { v: fmt1(def.produce.know * sumEff * lv * factor * 60) });
    default: return t('effect.none');
  }
}

export function openWagonSheet(getState, wagonId, onPickSurvivor, back = null) {
  openPanel('', () => {
    const state = getState();
    const w = state.train.wagons.find(x => x.id === wagonId);
    if (!w) return null;
    const def = WAGONS[w.type];
    const info = el('div', { class: 'wagon-info' },
      el('p', { class: 'wagon-desc', text: t('wagon.desc.' + w.type) }),
      el('p', { class: 'sheet-status', text: t('sheet.level', { n: w.level }) + ' · ' +
        (def.beds ? t('sheet.beds', { n: bedCount(w) }) : t('sheet.slots', { n: slotCount(w) })) }),
      el('h3', { text: t('sheet.effect') }),
      el('p', { text: effectText(state, w) }));
    if (def.power) info.appendChild(el('p', { class: 'muted', text: t('sheet.power', { p: def.power }) }));
    if (def.skill) info.appendChild(el('p', { class: 'muted', text: t('sheet.skillUsed', { k: t('skill.' + def.skill) }) }));
    if (w.attic) info.appendChild(el('p', { class: 'muted', text: t('sheet.attic', { p: BUILD.attic.primary, s: BUILD.attic.secondary }) }));
    // Atelier : choix de la recette
    if (w.type === 'workshop') {
      const row = el('div', { class: 'recipe-row' }, el('span', { class: 'muted', text: t('sheet.recipe') }));
      for (const r of ['parts', 'ammo']) {
        const b = el('button', { class: 'chip' + ((w.recipe || 'parts') === r ? ' on' : ''), type: 'button', text: t('res.' + r) });
        b.addEventListener('click', () => setRecipe(getState(), w, r));
        row.appendChild(b);
      }
      info.appendChild(row);
    }
    if (w.broken) {
      const enough = state.resources.parts >= 3;
      info.append(
        el('p', { class: 'warn-text', text: t('wagon.brokenSheet') }),
        el('p', { class: 'muted', text: canAutoRepair(state, w)
          ? t('wagon.repairing', { p: Math.floor((w.repairT || 0) * 100), s: Math.ceil((1 - (w.repairT || 0)) / repairRate(state, w)) })
          : t('wagon.repairAuto') }),
        el('button', { class: 'btn btn-primary', type: 'button', text: enough ? t('wagon.repairNow') : t('wagon.repairNoParts'),
          disabled: enough ? null : 'disabled',
          onclick: () => { if (repairNow(getState(), w)) toast(t('wagon.repaired', { wagon: t('wagon.' + w.type) })); } }));
    }

    const list = el('div', { class: 'crew-list' }, el('h3', { text: t('sheet.workers') }));
    const posted = state.crew.filter(s => s.post && s.post.wagon === w.id);
    const people = def.beds
      ? [...posted, ...restingPlaces(state).filter(r => r.place && r.place.wagon === w.id).map(r => r.s)]
      : posted;
    if (!people.length) list.appendChild(el('p', { class: 'muted', text: t('sheet.noWorkers') }));
    for (const s of people) list.appendChild(crewRow(state, s, w.type, () => onPickSurvivor(s.id, () => openWagonSheet(getState, wagonId, onPickSurvivor, back))));
    return { el: el('div', { class: 'sheet' }, info, list), title: t('wagon.' + w.type) };
  }, { back });
}

function crewRow(state, s, wagonType, onClick) {
  // Réparateur : c'est la Mécanique qui compte
  const skill = s.post && s.post.slot === 'repair' && wagonType ? 'mec' : (wagonType && WAGONS[wagonType] && WAGONS[wagonType].skill);
  const row = el('button', { class: 'crew-row', type: 'button', onclick: onClick },
    portrait(s, 40),
    el('span', { class: 'crew-row-text' },
      el('strong', { text: displayName(s) }),
      el('span', { class: 'muted', text: statusText(state, s) })),
    el('span', { class: 'crew-row-hp', title: t('sheet.hp') }, el('i')),
    el('span', { class: 'crew-row-skill' }));
  // Santé d'un coup d'œil
  const hp = row.querySelector('.crew-row-hp i');
  hp.style.width = Math.max(0, Math.min(100, s.hp)) + '%';
  hp.style.background = s.state === 'critical' || s.hp < 30 ? '#c8382d' : s.hp < 70 ? '#e8a33d' : '#8fd17e';
  // Onglet Équipage : les quatre compétences, de la meilleure à la moins bonne (les meilleures en grand)
  if (!wagonType) {
    row.classList.add('full');
    const box = row.querySelector('.crew-row-skill');
    box.className = 'crew-row-skills';
    const order = sortedSkills(s);
    const best = s.skills[order[0]];
    box.innerHTML = order.map(k => `<span class="sk${s.skills[k] === best ? '' : ' minor'}" title="${t('skill.' + k)}">${icon(k)}<span class="num">${s.skills[k]}</span></span>`).join('');
    return row;
  }
  const k = skill || s.main;
  // Au poste : efficacité réelle (compétence et moral) ; sinon le niveau de la compétence principale
  const val = skill && s.post ? Math.round(efficiency(s, k) * 100) + ' %' : s.skills[k];
  row.querySelector('.crew-row-skill').innerHTML = icon(k) + `<span class="num">${val}</span>`;
  return row;
}

// ---------- Onglet Équipage : tout le monde ----------
export function openCrewList(getState, onPick) {
  openPanel(t('crew.title'), () => {
    const state = getState();
    // Sous-onglets : Équipage, Arsenal, Fabrication (pastille quand on peut fabriquer : Halte)
    const { bar: tabsBar, active } = subTabs('crew', [
      { id: 'list', label: t('crew.tabList'), icon: 'crew', badge: state.crew.length },
      { id: 'arsenal', label: t('gear.tabArsenal'), icon: 'shield', badge: (state.inventory || []).length || null },
      { id: 'craft', label: t('gear.tabCraft'), icon: 'wrench', badge: isHalte(state) && Object.keys(CRAFT).some(k => canCraft(state, k)) ? '!' : null }
    ], 'list');
    const box = el('div', { class: 'sheet' });
    if (active === 'list') {
      box.appendChild(el('p', { class: 'muted', text: t('crew.countFull', countArgs(state)) }));
      box.appendChild(el('p', { class: 'muted small', text: t('crew.medkits', { n: state.medkits || 0 }) }));
      const list = el('div', { class: 'crew-list' });
      const sorted = [...state.crew].sort((a, b) => (a.post ? 0 : 1) - (b.post ? 0 : 1) || a.hp - b.hp);
      for (const s of sorted) list.appendChild(crewRow(state, s, null, () => onPick(s.id, () => openCrewList(getState, onPick))));
      box.appendChild(list);
    } else if (active === 'arsenal') box.appendChild(arsenalSection(getState));
    else box.appendChild(craftSection(getState));
    return { el: box, tabs: tabsBar };
  }, { tab: 'crew' });
}

export function countArgs(state) {
  const beds = state.train.wagons.reduce((n, w) => n + bedCount(w), 0) + BALANCE.crew.cabinBeds;   // Dormoirs, Couchettes
  return { n: state.crew.length, free: state.crew.filter(s => !s.post).length, beds };
}

export { closePanel, bestBunkLevel, efficiency, num };
