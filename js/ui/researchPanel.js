// Recherche (onglet Recherche) : trois branches en sous-onglets, chaque recherche avec son palier de zone.
import { t } from '../core/i18n.js';
import { el } from './modal.js';
import { icon } from './icons.js';
import { openPanel } from './panels.js';
import { subTabs } from './subtabs.js';
import { toast, buzz } from './toasts.js';
import { RESEARCH, RESEARCH_BRANCHES } from '../data/research.js';
import { ZONES } from '../data/zones.js';
import { canResearch, doResearch, hasResearch, hasLab, doneCount } from '../sim/research.js';
import { inSentence } from './zoneUI.js';

const BRANCH_ICON = { engine: 'steam', survival: 'heart', arms: 'target' };

function row(getState, state, id) {
  const R = RESEARCH[id];
  const done = hasResearch(state, id);
  const c = canResearch(state, id);
  const locked = c.reason === 'zone';
  const r = el('div', { class: 'research-row' + (done ? ' done' : '') + (locked ? ' locked' : '') },
    el('div', { class: 'research-text' },
      el('strong', { text: t('research.' + id) }),
      el('span', { class: 'muted small', text: t('research.' + id + '.fx') })));
  let note = '';
  if (locked) note = t('research.needZone', { zone: inSentence(ZONES[R.tier].name) });
  else if (c.reason === 'needs') note = t('research.needs', { list: R.needs.filter(n => !hasResearch(state, n)).map(n => t('research.' + n)).join(', ') });
  if (note) r.firstChild.appendChild(el('span', { class: 'warn-text small', text: note }));
  if (done) r.appendChild(el('span', { class: 'research-done', text: t('research.done') }));
  else {
    const b = el('button', { class: 'btn btn-small' + (c.ok ? ' btn-primary' : ''), type: 'button', disabled: c.ok ? null : 'disabled' },
      el('span', { class: 'num', text: String(R.cost) }), el('span', { class: 'cost-ico' }));
    b.lastChild.innerHTML = icon('know');
    b.addEventListener('click', () => {
      if (doResearch(getState(), id).ok) { toast(t('research.got', { name: t('research.' + id) })); buzz([20, 40, 60]); }
    });
    r.appendChild(b);
  }
  return r;
}

export function openResearch(getState) {
  openPanel(t('research.title'), () => {
    const state = getState();
    const box = el('div', { class: 'sheet research' });
    const total = Object.keys(RESEARCH).length;
    box.appendChild(el('p', { class: 'muted small', text: t('research.intro', { n: doneCount(state), total, k: Math.floor(state.resources.know || 0) }) }));
    if (!hasLab(state)) box.appendChild(el('p', { class: 'warn-text', text: t('research.noLab') }));
    const { bar, active } = subTabs('research', RESEARCH_BRANCHES.map(b => ({
      id: b, label: t('research.branch.' + b), icon: BRANCH_ICON[b],
      badge: Object.keys(RESEARCH).some(id => RESEARCH[id].branch === b && canResearch(state, id).ok) ? '!' : null
    })), 'engine');
    // Par palier (zone), dans l'ordre
    for (const tier of [1, 2, 3]) {
      const ids = Object.keys(RESEARCH).filter(id => RESEARCH[id].branch === active && RESEARCH[id].tier === tier);
      if (!ids.length) continue;
      box.appendChild(el('h3', { text: t('research.tier', { n: tier, zone: ZONES[tier].name }) }));
      const list = el('div', { class: 'research-list' });
      for (const id of ids) list.appendChild(row(getState, state, id));
      box.appendChild(list);
    }
    return { el: box, tabs: bar };
  }, { tab: 'research' });
}
