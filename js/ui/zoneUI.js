// Atelier de la traverse (onglet « Traverse » de la gare) : équipement de zone de la locomotive.
import { t } from '../core/i18n.js';
import { el } from './modal.js';
import { toast, buzz } from './toasts.js';
import { costEl } from './stationPanel.js';
import { ZONES, zoneOf } from '../data/zones.js';
import { getCircuit } from '../data/circuits.js';
import { progress, kitFor, canCraftKit, craftKit, traverseState } from '../sim/zones.js';

// « Le Désert de Verre » → « le Désert de Verre » (au milieu d'une phrase)
export const inSentence = name => name ? name[0].toLowerCase() + name.slice(1) : '';

export function traverseSection(getState, state) {
  const ring = state.route.ring;
  const zone = zoneOf(ring);
  const next = ZONES[zone.next];
  const kit = kitFor(ring);
  const p = progress(state);
  const box = el('div', { class: 'zone-box' });
  box.appendChild(el('p', { class: 'muted small', text: t('spec.traverse.desc') }));
  box.appendChild(el('p', { class: 'sheet-status', text: t('zone.slot', { kit: p.kit ? t('kit.' + p.kit) : t('zone.noKit') }) }));
  if (!kit || !next) return box;

  // Zone suivante pas encore dans le jeu : panneau grisé « Prochainement »
  if (traverseState(state, zone.next) === 'soon') {
    box.appendChild(el('div', { class: 'contract zone-kit soon' },
      el('div', { class: 'contract-head' }, el('strong', { text: t('kit.' + kit.id) }),
        el('span', { class: 'contract-due', text: t('zone.kitFor', { zone: inSentence(next.name) }) })),
      el('p', { class: 'muted small', text: t('zone.soonSub', { zone: next.name }) }),
      el('div', { class: 'contract-row' }, el('button', { class: 'btn btn-small', type: 'button', disabled: 'disabled', text: t('zone.soon') }))));
    return box;
  }

  const { material, ...res } = kit.cost;
  const mat = t('mat.' + material);
  const have = (p.materials[material] || 0) > 0;
  const c = canCraftKit(state, ring);
  // Forteresse du boss de la zone (son nom aide le joueur à la trouver sur la carte)
  let fortress = null;
  for (const leg of getCircuit(ring).legs) for (const br of leg.branches) for (const st of br.sites) if (st.boss === zone.boss) fortress = st;
  const card = el('div', { class: 'contract zone-kit' },
    el('div', { class: 'contract-head' }, el('strong', { text: t('kit.' + kit.id) }),
      el('span', { class: 'contract-due', text: t('zone.kitFor', { zone: inSentence(next.name) }) })));
  const done = p.kit === kit.id;
  card.appendChild(el('p', { class: done || have ? 'gain-text small' : 'warn-text small', text: done ? t('zone.mounted', { kit: t('kit.' + kit.id) })
    : have ? t('zone.haveMat', { mat }) : t('zone.needMat', { mat, boss: t('boss.' + zone.boss), site: fortress ? fortress.name : '' }) }));
  const cost = el('span', { class: 'zone-cost' }, el('span', { class: 'mat-chip' + (have ? ' on' : ''), text: t('zone.material', { mat }) }), costEl(res));
  const b = el('button', { class: 'btn btn-small btn-primary', type: 'button', disabled: c.ok ? null : 'disabled',
    text: done ? t('zone.done') : t('zone.craft') });
  b.addEventListener('click', () => {
    const r = craftKit(getState(), ring);
    if (r.ok) { toast(t('zone.crafted', { kit: t('kit.' + kit.id) })); buzz([30, 40, 80]); }
  });
  card.appendChild(el('div', { class: 'contract-row' }, cost, b));
  box.appendChild(card);
  if (done) box.appendChild(el('p', { class: 'gain-text small', text: t('zone.open', { zone: inSentence(next.name) }) }));
  return box;
}
