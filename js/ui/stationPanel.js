// Panneau de la gare (GDD §8) : trocs, services, recrue, réputation. S'ouvre pendant la Halte en gare.
import { t } from '../core/i18n.js';
import { el } from './modal.js';
import { icon } from './icons.js';
import { openPanel, closePanel } from './panels.js';
import { subTabs, setSubTab } from './subtabs.js';
import { traverseSection } from './zoneUI.js';
import { canCraftKit } from '../sim/zones.js';
import { toast, buzz } from './toasts.js';
import { portrait } from './sheets.js';
import { itemStats } from './gearUI.js';
import { STATION } from '../data/stations.js';
import { SKILLS, displayName, bedsTotal } from '../sim/crew.js';
import { leaveStop } from '../sim/route.js';
import {
  stationSite, stationVisit, stationState, repLevel, tradeGet, doTrade,
  recruitCost, canRecruit, recruit, canHire, buyShopItem, depotVisit, recruitAtDepot, repairOffer, repairAt, keyOffer, buyKey, rumorOffer, buyRumor, unknownBranches,
  acceptContract, canDeliver, deliver, contractReward
} from '../sim/station.js';

let pickingRumor = false;

// Coût affiché avec icônes : « 10 ⛭ · 4 ⚙ »
export function costEl(cost, cls = '') {
  const box = el('span', { class: 'cost ' + cls });
  const entries = Object.entries(cost || {}).filter(([, v]) => v > 0);
  if (!entries.length) { box.textContent = t('station.free'); return box; }
  for (const [r, v] of entries) {
    const item = el('span', { class: 'cost-item' }, el('span', { class: 'num', text: String(v) }), el('span', { class: 'cost-ico' }));
    item.lastChild.innerHTML = icon(r);
    item.title = t('res.' + r);
    box.appendChild(item);
  }
  return box;
}

function resChip(res, n) {
  const c = el('span', { class: 'res-chip' }, el('span', { class: 'num', text: String(n) }), el('span', { class: 'cost-ico' }));
  c.lastChild.innerHTML = icon(res);
  c.title = t('res.' + res);
  return c;
}

function stars(n) {
  const s = el('span', { class: 'stars', title: t('station.rep', { n }) });
  for (let i = 0; i < 5; i++) {
    const st = el('span', { class: 'star' + (i < n ? ' on' : '') });
    st.innerHTML = icon('star');
    s.appendChild(st);
  }
  return s;
}

// Recrues proposées (gare ou dépôt) : portrait, compétences, couchages, bouton Recruter
export function recruitSection(state, visit, rc, onHire, cost = null) {
  const out = [];
  if (visit.hired) { out.push(el('p', { class: 'muted', text: t('station.hired') })); return out; }
  out.push(el('p', { class: 'muted small', text: t('station.beds', { n: state.crew.length, beds: bedsTotal(state) }) }));
  if (rc.reason === 'beds') out.push(el('p', { class: 'warn-text small', text: t('station.noBed') }));
  visit.recruits.forEach((s, i) => {
    const skills = el('span', { class: 'recruit-skills' });
    for (const k of SKILLS) {
      const sk = el('span', { class: 'recruit-skill' + (k === s.main ? ' main' : '') }, el('span'), el('span', { class: 'num', text: String(s.skills[k]) }));
      sk.firstChild.innerHTML = icon(k);
      sk.title = t('skill.' + k);
      skills.appendChild(sk);
    }
    const b = el('button', { class: 'btn btn-small btn-primary', type: 'button', disabled: rc.ok ? null : 'disabled' },
      document.createTextNode(t('station.hire') + ' '), costEl(cost || recruitCost(state)));
    b.addEventListener('click', () => {
      const r = onHire(i);
      if (r.ok) { toast(t('station.welcome', { name: displayName(r.s) })); buzz([15, 30, 15]); }
    });
    out.push(el('div', { class: 'recruit-row' }, portrait(s, 44),
      el('div', { class: 'recruit-text' }, el('strong', { text: displayName(s) }),
        el('span', { class: 'muted small', text: t('station.main', { k: t('skill.' + s.main) })
          + ' · ' + (s.kit ? t('station.kit', { name: t('item.' + s.kit) }) : t('station.noKit')) }), skills), b));
  });
  return out;
}

// Volontaires du dépôt (un par tour, pendant la Halte)
export function openDepotRecruit(getState) {
  openPanel(t('depot.recruitTitle'), () => {
    const state = getState();
    if (state.route.mode !== 'depot') return null;
    const visit = depotVisit(state);
    const box = el('div', { class: 'sheet station' },
      el('p', { class: 'muted small', text: t('depot.recruitIntro') }));
    box.append(...recruitSection(state, visit, canHire(state, visit), i => recruitAtDepot(getState(), i)));
    return { el: box };
  }, { wide: true });
}

// Carte de contrat : ressource, quantité, délai, récompense ; Accepter puis Livrer aux passages suivants
export function contractCard(getState, state, site, c, compact = false) {
  const head = el('div', { class: 'contract-head' }, resChip(c.res, c.qty),
    el('strong', { text: t('contract.deliver', { n: c.qty, res: t('res.' + c.res) }) }));
  if (c.accepted) head.appendChild(el('span', { class: 'contract-due' + (c.deadline <= state.route.lap ? ' late' : ''), text: t('contract.due', { lap: c.deadline }) }));
  else head.appendChild(el('span', { class: 'contract-due', text: t('contract.laps', { n: c.laps }) }));
  const card = el('div', { class: 'contract' }, head);
  if (compact) card.prepend(el('span', { class: 'muted small', text: site.name }));
  card.appendChild(el('p', { class: 'muted small', text: t('contract.reward', { p: contractReward(c) }) }));
  if (!c.accepted) {
    if (!compact) {
      const b = el('button', { class: 'btn btn-small btn-primary', type: 'button', text: t('contract.accept') });
      b.addEventListener('click', () => { if (acceptContract(getState(), site).ok) { toast(t('contract.accepted', { lap: getState().route.lap + c.laps })); buzz(15); } });
      card.appendChild(el('div', { class: 'contract-row' }, el('span', { class: 'muted small', text: t('contract.acceptSub') }), b));
    }
    return card;
  }
  const bar = el('div', { class: 'bar' }, el('div', { class: 'bar-fill' }));
  bar.firstChild.style.width = Math.round(c.delivered / c.qty * 100) + '%';
  const row = el('div', { class: 'contract-row' }, bar, el('span', { class: 'num small', text: `${c.delivered} / ${c.qty}` }));
  if (!compact) {
    const d = canDeliver(state, site);
    if (d.reason === 'later') row.appendChild(el('span', { class: 'muted small', text: t('contract.later') }));
    else {
      const b = el('button', { class: 'btn btn-small btn-primary', type: 'button', disabled: d.ok ? null : 'disabled',
        text: d.ok ? t('contract.deliverN', { n: d.n }) : t('contract.nothing', { res: t('res.' + c.res) }) });
      b.addEventListener('click', () => {
        const r = deliver(getState(), site);
        if (r.ok) buzz(r.done ? [30, 30, 60] : 15);
      });
      row.appendChild(b);
    }
  }
  card.appendChild(row);
  return card;
}

export function openStation(getState, { onTrain, onLeave }) {
  pickingRumor = false;
  const s0 = stationSite(getState());
  setSubTab('station', s0 && s0.specialty === 'traverse' ? 'traverse' : 'trades');
  openPanel('', () => {
    const state = getState();
    const site = stationSite(state);
    if (!site) return null;
    const visit = stationVisit(state, site);
    const st = stationState(state, site.id);
    const res = state.resources;
    const box = el('div', { class: 'sheet station' });

    // Sous-onglets : Trocs, Services, Contrat, Recrue
    const rc = canRecruit(state, site);
    const c = st.contract;
    const cBadge = c && (!c.accepted || canDeliver(state, site).ok) ? '!' : null;
    const isTraverse = site.specialty === 'traverse';
    const { bar, active } = subTabs('station', [
      { id: 'traverse', label: t('zone.tab'), icon: 'train', hidden: !isTraverse, badge: isTraverse && canCraftKit(state, state.route.ring).ok ? '!' : null },
      { id: 'trades', label: t('station.trades'), icon: 'trade' },
      { id: 'services', label: t('station.services'), icon: 'wrench' },
      { id: 'contract', label: t('contract.title'), icon: 'log', badge: cBadge, hidden: !c },
      { id: 'recruit', label: t('station.recruit'), icon: 'crew', badge: !visit.hired && rc.ok ? visit.recruits.length : null }
    ], 'trades');

    // En-tête : spécialité et réputation, sur le premier onglet seulement (la place est comptée sur téléphone)
    if (active === (isTraverse ? 'traverse' : 'trades')) box.appendChild(el('div', { class: 'station-head' },
      el('span', { class: 'muted small', text: site.specialty ? t('spec.' + site.specialty) : t('site.station') }),
      stars(repLevel(st))));
    if (active === 'traverse') box.appendChild(traverseSection(getState, state));

    if (active === 'trades') {
      const trades = el('div', { class: 'trade-list' });
      visit.trades.forEach((tr, i) => {
        const y = tradeGet(state, st, tr);
        const enough = (res[tr.from] || 0) >= tr.x;
        const btn = el('button', { class: 'btn btn-small' + (tr.done ? ' btn-ghost' : ' btn-primary'), type: 'button',
          disabled: tr.done || !enough ? 'disabled' : null, text: tr.done ? t('station.done') : t('station.trade') });
        btn.addEventListener('click', () => {
          const r = doTrade(getState(), site, i);
          if (r.ok) { buzz(10); if (r.lost > 0.5) toast(t('station.overflow', { n: Math.round(r.lost), res: t('res.' + tr.to) }), 'warn'); }
        });
        const arrow = el('span', { class: 'trade-arrow' });
        arrow.innerHTML = icon('trade');
        trades.appendChild(el('div', { class: 'trade-row' + (tr.done ? ' done' : '') }, resChip(tr.from, tr.x), arrow, resChip(tr.to, y), btn));
      });
      box.appendChild(trades);
    }

    if (active === 'services') {
      const services = el('div', { class: 'service-list' });
      const service = (label, sub, cost, ok, onClick, doneText) => {
        const b = el('button', { class: 'btn btn-small', type: 'button', disabled: ok ? null : 'disabled' }, doneText ? document.createTextNode(doneText) : costEl(cost));
        b.addEventListener('click', onClick);
        services.appendChild(el('div', { class: 'service-row' }, el('div', { class: 'service-text' }, el('strong', { text: label }), el('span', { class: 'muted', text: sub })), b));
      };
      const rep = repairOffer(state, site);
      service(t('station.repair'), t('station.repairSub', { g: rep.gain }), rep.cost, rep.ok, () => { if (repairAt(getState(), site)) buzz(10); }, rep.full ? t('depot.full') : null);
      const key = keyOffer(state, site);
      service(t('station.key'), t('station.keySub'), key.cost, key.ok, () => { if (buyKey(getState(), site)) { buzz([15, 30, 15]); toast(t('station.keyBought')); } }, key.done ? t('station.done') : null);
      // Équipement à vendre
      (visit.shop || []).forEach((o, i) => {
        service(t('station.shop', { name: t('item.' + o.type) }), itemStats(o.type), o.cost,
          !o.sold && Object.entries(o.cost).every(([r, v]) => (state.resources[r] || 0) >= v),
          () => { if (buyShopItem(getState(), site, i)) { toast(t('station.bought', { name: t('item.' + o.type) })); buzz([15, 30, 15]); } },
          o.sold ? t('station.done') : null);
      });
      const rum = rumorOffer(state, site);
      service(t('station.rumor'), t('station.rumorSub'), rum.cost, rum.ok, () => { pickingRumor = true; }, rum.done ? t('station.done') : !rum.any ? t('station.nothing') : null);
      box.appendChild(services);
      if (pickingRumor && rum.ok) {
        const list = el('div', { class: 'rumor-list' }, el('p', { class: 'small', text: t('station.rumorPick') }));
        for (const u of unknownBranches(state)) {
          const b = el('button', { class: 'chip', type: 'button', text: t('station.rumorLeg', { n: u.leg + 1 }) + ' · ' + t('signal.' + u.b.signal) });
          b.addEventListener('click', () => {
            if (buyRumor(getState(), site, u.b.id)) { pickingRumor = false; toast(t('station.rumorDone', { name: u.b.name })); buzz(15); }
          });
          list.appendChild(b);
        }
        box.appendChild(list);
      }
    }

    // Contrat (GDD §8.4)
    if (active === 'contract' && c) {
      box.appendChild(contractCard(getState, state, site, c));
    }

    // Recrue(s)
    if (active === 'recruit') box.append(...recruitSection(state, visit, rc, i => recruit(getState(), site, i)));

    // Pied : atelier du train, départ
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

export { STATION };
