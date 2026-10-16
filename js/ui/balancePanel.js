// Bilan des ressources (toucher la barre des ressources) : production et consommation actuelles, par minute.
// Ce qui arrive par à-coups (récolte aux arrêts, butin, trocs, entretien) est résumé à part : récolté ce tour.
import { t } from '../core/i18n.js';
import { el } from './modal.js';
import { icon } from './icons.js';
import { openPanel } from './panels.js';
import { capacities } from '../core/state.js';
import { economyFlows } from '../sim/energy.js';
import { upkeepCost } from '../sim/zones.js';

const RES = ['fuel', 'food', 'scrap', 'ammo', 'parts', 'know'];
const fmt = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(Math.round(v * 10) / 10).toLocaleString('fr-FR');

export function openBalance(getState) {
  openPanel(t('balance.title'), () => {
    const state = getState();
    const running = state.route.mode === 'run';
    const flows = economyFlows(state, running);
    // En route (si on est arrêté) : ce que la traction brûlera en plus
    let routeFuel = 0;
    if (!running) {
      const keep = state.power;
      const f2 = economyFlows(state, true).filter(f => f.src === 'boiler').reduce((a, f) => a + f.v, 0);
      const f1 = flows.filter(f => f.src === 'boiler').reduce((a, f) => a + f.v, 0);
      routeFuel = (f2 - f1) * 60;
      state.power = keep;
    }
    const caps = capacities(state);
    const gained = (state.route.lapStats && state.route.lapStats.gained) || {};
    const box = el('div', { class: 'sheet balance' });
    box.appendChild(el('p', { class: 'muted small', text: t(running ? 'balance.introRun' : 'balance.introStop') }));
    const list = el('div', { class: 'bal-list' });
    for (const r of RES) {
      const fs = flows.filter(f => f.res === r);
      const prod = fs.filter(f => f.v > 0).reduce((a, f) => a + f.v, 0) * 60;
      const use = fs.filter(f => f.v < 0).reduce((a, f) => a + f.v, 0) * 60;
      const net = prod + use;
      const head = el('div', { class: 'bal-head' });
      head.appendChild(el('span', { class: 'bal-ico' })).innerHTML = icon(r);
      head.append(el('strong', { text: t('res.' + r) }),
        el('span', { class: 'num muted small', text: `${Math.floor(state.resources[r] || 0)} / ${caps[r]}` }),
        el('span', { class: 'num bal-net ' + (net > 0.05 ? 'pos' : net < -0.05 ? 'neg' : ''), text: t('balance.perMin', { v: fmt(net) }) }));
      const row = el('div', { class: 'bal-row' }, head);
      // Détail par source (regroupé par type de wagon)
      const by = new Map();
      for (const f of fs) by.set(f.src, (by.get(f.src) || 0) + f.v * 60);
      const det = el('div', { class: 'bal-detail' });
      for (const [src, v] of by) det.appendChild(el('span', { class: v >= 0 ? 'pos' : 'neg', text: `${t('balance.src.' + src)} ${fmt(v)}` }));
      if (r === 'fuel' && routeFuel < -0.05) det.appendChild(el('span', { class: 'neg', text: t('balance.routeFuel', { v: fmt(routeFuel) }) }));
      if (r === 'ammo') det.appendChild(el('span', { class: 'muted', text: t('balance.ammoFight') }));
      if (gained[r] > 0.5) det.appendChild(el('span', { class: 'pos', text: t('balance.gained', { v: Math.round(gained[r]) }) }));
      if (det.childNodes.length) row.appendChild(det);
      list.appendChild(row);
    }
    box.appendChild(list);
    // Entretien prélevé au prochain passage au dépôt
    const up = upkeepCost(state);
    box.appendChild(el('p', { class: 'muted small', text: t('balance.upkeep', { s: up.scrap, p: up.parts }) }));
    return { el: box };
  });
}
