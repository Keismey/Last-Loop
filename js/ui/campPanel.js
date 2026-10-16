// Panneau d'un camp (GDD §3.4, §8.5) : s'ouvre pendant la Halte au camp.
// Commerce (Allié, Pacifique), aide, négociation (Prudent, Méfiant), recrue offerte (Allié).
import { t } from '../core/i18n.js';
import { el } from './modal.js';
import { icon } from './icons.js';
import { openPanel, closePanel } from './panels.js';
import { subTabs, setSubTab } from './subtabs.js';
import { toast, buzz } from './toasts.js';
import { costEl, recruitSection } from './stationPanel.js';
import { CAMP, ATTITUDES, ATTITUDE_COLORS } from '../data/sites.js';
import { leaveStop } from '../sim/route.js';
import { stationSite } from '../sim/station.js';
import {
  attitudeOf, campState, campVisit, tradesOpen, campTradeGet, doCampTrade, canAid, aidCamp,
  canNegotiate, negotiate, canHireAtCamp, hireAtCamp, resFactor, trustLeft
} from '../sim/camp.js';

function resChip(res, n) {
  const c = el('span', { class: 'res-chip' }, el('span', { class: 'num', text: String(n) }), el('span', { class: 'cost-ico' }));
  c.lastChild.innerHTML = icon(res);
  c.title = t('res.' + res);
  return c;
}

// Échelle des attitudes : la position du camp est mise en avant
function attitudeScale(att) {
  const box = el('div', { class: 'att-scale' });
  for (const a of ATTITUDES) {
    const step = el('span', { class: 'att-step' + (a === att ? ' on' : ''), text: t('attitude.' + a) });
    step.style.setProperty('--c', ATTITUDE_COLORS[a]);
    box.appendChild(step);
  }
  return box;
}

const ATT_TOAST = { ally: 'camp.nowAlly', peaceful: 'camp.nowPeaceful', wary: 'camp.nowWary', suspicious: 'camp.nowSuspicious' };

export function openCamp(getState, { onTrain, onLeave }) {
  // On ouvre sur le commerce s'il est possible, sinon sur les relations
  const s0 = getState(), site0 = stationSite(s0);
  setSubTab('camp', site0 && site0.type === 'camp' && campVisit(s0, site0).trades.length && tradesOpen(s0, site0) ? 'trade' : 'relations');
  openPanel('', () => {
    const state = getState();
    const site = stationSite(state);
    if (!site || site.type !== 'camp') return null;
    const st = campState(state, site);
    const visit = campVisit(state, site);
    const att = attitudeOf(state, site);
    const res = state.resources;
    const box = el('div', { class: 'sheet station camp' });

    box.appendChild(el('div', { class: 'station-head' },
      el('span', { class: 'muted', text: `${t('camp.' + site.camp)} · ${t('camp.defense', { n: st.defense || 0 })}` + (st.grudge ? ' · ' + t('camp.grudge') : '') })));
    box.appendChild(attitudeScale(att));

    // Sous-onglets : Commerce, Relations, Recrue
    const hc = att === 'ally' ? canHireAtCamp(state, site) : { ok: false };
    const { bar, active } = subTabs('camp', [
      { id: 'trade', label: t('camp.tabTrade'), icon: 'trade' },
      { id: 'relations', label: t('camp.relations'), icon: 'smile' },
      { id: 'recruit', label: t('station.recruit'), icon: 'crew', badge: hc.ok && !visit.hired ? visit.recruits.length : null }
    ], 'trade');

    // Commerce
    if (active === 'trade' && visit.trades.length) {
      if (!tradesOpen(state, site)) box.appendChild(el('p', { class: 'muted small', text: t('camp.noTrade') }));
      else {
        const list = el('div', { class: 'trade-list' });
        visit.trades.forEach((tr, i) => {
          const y = campTradeGet(state, site, tr);
          const enough = (res[tr.from] || 0) >= tr.x;
          const btn = el('button', { class: 'btn btn-small' + (tr.done ? ' btn-ghost' : ' btn-primary'), type: 'button',
            disabled: tr.done || !enough ? 'disabled' : null, text: tr.done ? t('station.done') : t('station.trade') });
          btn.addEventListener('click', () => {
            const r = doCampTrade(getState(), site, i);
            if (r.ok) { buzz(10); if (r.lost > 0.5) toast(t('station.overflow', { n: Math.round(r.lost), res: t('res.' + tr.to) }), 'warn'); }
          });
          const arrow = el('span', { class: 'trade-arrow' });
          arrow.innerHTML = icon('trade');
          list.appendChild(el('div', { class: 'trade-row' + (tr.done ? ' done' : '') }, resChip(tr.from, tr.x), arrow, resChip(tr.to, y), btn));
        });
        box.appendChild(list);
        if (att === 'ally') box.appendChild(el('p', { class: 'gain-text small', text: t('camp.allyRate', { p: Math.round((CAMP.rate.ally - 1) * 100) }) }));
      }
    } else if (active === 'trade') box.appendChild(el('p', { class: 'muted small', text: t('camp.noMarket') }));

    // Relations : aider, négocier
    if (active === 'relations') {
      box.appendChild(el('p', { class: 'muted small', text: t('camp.desc.' + att) }));
      const services = el('div', { class: 'service-list' });
      const row = (label, sub, buttons) => services.appendChild(el('div', { class: 'service-row' },
        el('div', { class: 'service-text' }, el('strong', { text: label }), el('span', { class: 'muted', text: sub })), ...buttons));
      const aidButtons = CAMP.aid.map((cost, k) => {
        const c = canAid(state, site, k);
        const b = el('button', { class: 'btn btn-small', type: 'button', disabled: c.ok ? null : 'disabled' }, visit.aided ? document.createTextNode(t('station.done')) : costEl(cost));
        b.addEventListener('click', () => {
          const r = aidCamp(getState(), site, k);
          if (!r.ok) return;
          buzz([15, 30, 15]);
          if (r.forgiven) toast(t('camp.forgiven', { name: site.name }));
          else if (r.att === 'peaceful') toast(t('camp.trustUp', { name: site.name }));
          else if (ATT_TOAST[r.att]) toast(t(ATT_TOAST[r.att], { name: site.name }));
        });
        return b;
      });
      if (att === 'ally') row(t('camp.aid'), st.grudge ? t('camp.aidGrudge') : t('camp.aidAlly'), st.grudge ? aidButtons : []);
      else row(t('camp.aid'), st.grudge ? t('camp.aidGrudge') : att === 'peaceful' ? t('camp.aidTrust', { n: trustLeft(state, site) }) : t('camp.aidSub'), aidButtons);
      if (att === 'wary' || att === 'suspicious') {
        const c = canNegotiate(state, site);
        const b = el('button', { class: 'btn btn-small', type: 'button', disabled: c.ok ? null : 'disabled' }, visit.negotiated ? document.createTextNode(t('station.done')) : costEl(CAMP.negotiate));
        b.addEventListener('click', () => {
          const r = negotiate(getState(), site);
          if (r.ok) { buzz([15, 30, 15]); if (ATT_TOAST[r.att]) toast(t(ATT_TOAST[r.att], { name: site.name })); }
        });
        row(t('camp.negotiate'), t('camp.negotiateSub'), [b]);
      }
      box.appendChild(services);
      box.appendChild(el('p', { class: 'muted small', text: t('camp.raidHint', { p: Math.round(resFactor(state, site) * 100) }) }));
    }

    // Recrue offerte par un allié
    if (active === 'recruit') {
      if (att === 'ally') box.append(...recruitSection(state, visit, hc, i => hireAtCamp(getState(), site, i), {}));
      else box.appendChild(el('p', { class: 'muted small', text: t('camp.recruitAlly') }));
    }

    const foot = el('div', { class: 'station-foot' },
      el('button', { class: 'btn', type: 'button', text: t('station.toTrain'), onclick: onTrain }),
      el('button', { class: 'btn btn-primary btn-depart', type: 'button', text: t('stop.leave'), onclick: () => {
        leaveStop(getState());
        closePanel();
        onLeave && onLeave();
      } }));
    return { el: box, foot, tabs: bar, title: site.name };
  }, { wide: true });
}
