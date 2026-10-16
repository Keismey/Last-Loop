// Carnet de bord (onglet Carnet) : objectifs de la zone, contrats en cours, journal du voyage.
import { t } from '../core/i18n.js';
import { el } from './modal.js';
import { openPanel } from './panels.js';
import { subTabs } from './subtabs.js';
import { toast, buzz } from './toasts.js';
import { activeContracts } from '../sim/station.js';
import { contractCard, costEl } from './stationPanel.js';
import { currentObjectives, objectiveValue, objectiveState, claimObjective, claimable } from '../sim/objectives.js';
import { zoneMax } from '../sim/zones.js';
import { ZONES } from '../data/zones.js';

function objectivesSection(getState, state) {
  const box = el('div', { class: 'obj-box' });
  box.appendChild(el('p', { class: 'muted small', text: t('obj.intro', { zone: ZONES[zoneMax(state)].name }) }));
  const list = el('div', { class: 'research-list' });
  for (const o of currentObjectives(state)) {
    const st = objectiveState(state, o.id);
    const v = objectiveValue(state, o);
    const row = el('div', { class: 'research-row obj-row' + (st === 'claimed' ? ' done' : '') },
      el('div', { class: 'research-text' },
        el('strong', { text: t('obj.' + o.id, { n: o.n }) }),
        el('span', { class: 'muted small' }, document.createTextNode(o.n > 1 ? `${v} / ${o.n} · ` : ''), costEl(o.reward))));
    if (st === 'claimed') row.appendChild(el('span', { class: 'research-done', text: t('obj.claimed') }));
    else if (st === 'done') {
      const b = el('button', { class: 'btn btn-small btn-primary', type: 'button', text: t('obj.claim') });
      b.addEventListener('click', () => { if (claimObjective(getState(), o.id).ok) { buzz([15, 30, 15]); toast(t('obj.got')); } });
      row.appendChild(b);
    } else {
      const bar = el('div', { class: 'bar obj-bar' }, el('div', { class: 'bar-fill' }));
      bar.firstChild.style.width = Math.round(v / o.n * 100) + '%';
      row.appendChild(bar);
    }
    list.appendChild(row);
  }
  box.appendChild(list);
  return box;
}

function journalSection(state) {
  const box = el('div', { class: 'sheet' });
  const entries = state.log || [];
  if (!entries.length) { box.appendChild(el('p', { class: 'muted small', text: t('log.empty') })); return box; }
  const ledger = el('div', { class: 'ledger' });
  for (const e of entries) {
    ledger.appendChild(el('div', { class: 'log-entry' },
      el('span', { class: 'log-lap', text: t('log.lap', { n: e.lap }) }),
      el('span', { text: e.key === 'log.event'
        ? t('ev.' + e.ev + '.title') + ' : ' + t('ev.' + e.ev + '.' + e.choice).toLowerCase()
        : t(e.key, e) })));
  }
  box.appendChild(ledger);
  return box;
}

export function openLog(getState) {
  openPanel(t('log.title'), () => {
    const state = getState();
    const contracts = activeContracts(state);
    const { bar, active } = subTabs('log', [
      { id: 'obj', label: t('obj.tab'), icon: 'star', badge: claimable(state) || null },
      { id: 'contracts', label: t('log.contracts'), icon: 'log', badge: contracts.length || null },
      { id: 'journal', label: t('log.journal'), icon: 'clock' }
    ], 'obj');
    const box = el('div', { class: 'sheet' });
    if (active === 'obj') box.appendChild(objectivesSection(getState, state));
    if (active === 'contracts') {
      if (!contracts.length) box.appendChild(el('p', { class: 'muted small', text: t('log.noContract') }));
      for (const { site, c } of contracts) box.appendChild(contractCard(getState, state, site, c, true));
    }
    if (active === 'journal') box.appendChild(journalSection(state));
    return { el: box, tabs: bar };
  }, { tab: 'log' });
}
