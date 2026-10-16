// Résumé du tour, affiché à l'arrivée au dépôt (GDD §3.7).
import { t } from '../core/i18n.js';
import { el } from './modal.js';
import { icon } from './icons.js';
import { openPanel } from './panels.js';
import { PROGRESS } from '../data/balance.js';
import { zoneOf } from '../data/zones.js';

const RES = ['fuel', 'food', 'scrap', 'ammo', 'parts', 'know', 'keys'];

export function openSummary(getState) {
  openPanel('', () => {
    const s = getState().route.summary;
    if (!s) return null;
    const table = el('table', { class: 'sum-table' });
    table.appendChild(el('tr', {},
      el('th', { text: t('summary.res') }), el('th', { text: t('summary.start') }),
      el('th', { text: t('summary.gained') }), el('th', { text: t('summary.end') })));
    for (const r of RES) {
      const g = Math.round(s.gained[r] || 0);
      const start = Math.floor(s.start[r] || 0), end = Math.floor(s.end[r] || 0);
      if (!g && start === end && r !== 'fuel' && r !== 'food') continue;
      const name = el('td', { class: 'sum-res' });
      name.innerHTML = icon(r) + `<span>${t('res.' + r)}</span>`;
      const diff = end - start;
      table.appendChild(el('tr', {}, name,
        el('td', { class: 'num', text: start }),
        el('td', { class: 'num gain', text: g ? '+' + g : '–' }),
        el('td', { class: 'num ' + (diff < 0 ? 'neg' : 'pos'), text: end })));
    }
    const box = el('div', { class: 'sheet' },
      el('p', { class: 'sheet-status', text: t('summary.stops', { n: s.stops, b: s.breakdowns, d: s.newBranches }) }),
      el('p', { class: 'sheet-status', text: t('summary.combat', { w: s.waves || 0, k: s.kills || 0 }) }));
    if (s.derailed) {
      const lost = Object.entries(s.lost || {}).filter(([, v]) => v >= 0.5).map(([r, v]) => `−${Math.round(v)} ${t('res.' + r)}`).join(', ');
      box.appendChild(el('p', { class: 'warn-text', text: t('summary.derailed', { lost }) }));
    }
    box.append(
      el('div', { class: 'sum-scroll' }, table),
      el('p', { class: 'muted', text: t(s.derailed ? 'summary.healDerail' : 'summary.heal') }));
    const reserve = Object.entries(s.reserve || {});
    if (reserve.length) {
      box.appendChild(el('p', { class: 'warn-text', text: t('summary.reserve', {
        list: reserve.map(([r, v]) => `+${Math.round(v)} ${t('res.' + r)}`).join(', ')
      }) }));
    }
    // Entretien du convoi
    if (s.upkeep) {
      const u = s.upkeep;
      const paid = Object.entries(u.paid || {}).filter(([, v]) => v >= 0.5).map(([r, v]) => `−${Math.round(v)} ${t('res.' + r)}`).join(', ');
      box.appendChild(el('p', { class: u.short > 0 ? 'warn-text' : 'muted', text: u.short > 0
        ? t('summary.upkeepShort', { paid: paid || '0' })
        : t('summary.upkeep', { paid: paid || '0' }) }));
    }
    // Traque : la menace du tour qui commence
    if (s.hunt > 0) box.appendChild(el('p', { class: 'warn-text', text: t('summary.hunt', { p: Math.round(s.hunt * PROGRESS.huntStep * 100), boss: t('boss.' + zoneOf(getState().route.ring).boss) }) }));
    if (s.memorial && s.memorial.length) box.appendChild(el('p', { class: 'warn-text', text: t('summary.memorial', { names: s.memorial.join(', ') }) }));
    box.appendChild(el('h3', { text: t('summary.news') }));
    if (!s.news.length) box.appendChild(el('p', { class: 'muted', text: t('summary.noNews') }));
    for (const n of s.news.slice(0, 6)) box.appendChild(el('p', { text: '• ' + t(n.key, n) }));
    return { el: box, title: t('summary.title', { n: s.lap }) };
  }, { static: true });
}
