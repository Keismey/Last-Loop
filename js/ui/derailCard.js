// Carte du déraillement : comme un événement (illustration, récit), pour comprendre pourquoi on se retrouve au dépôt
// et ce que l'accident a coûté. « Au dépôt » ouvre ensuite le résumé du tour.
import { t, pct } from '../core/i18n.js';
import { el, openModal, closeModal } from './modal.js';
import { art } from './eventCard.js';
import { COMBAT } from '../data/enemies.js';
import { PROGRESS } from '../data/balance.js';

export function openDerail(summary, eased, onDone) {
  const lost = Object.entries(summary.lost || {}).filter(([, v]) => v >= 0.5).map(([r, v]) => `−${Math.round(v)} ${t('res.' + r)}`).join(', ');
  const D = COMBAT.derail;
  const list = el('ul', { class: 'derail-list' },
    el('li', { text: t('derail.lost', { p: pct(Math.round(D.resLoss * 100)), list: lost || t('derail.nothing') }) }),
    el('li', { text: t('derail.crew', { hp: D.hp }) }),
    el('li', { text: t('derail.train', { p: pct(Math.round(Math.max(D.integrity, PROGRESS.depotIntegrityFloor) * 100)) }) }));
  if (eased) list.appendChild(el('li', { text: t('derail.hunt', { n: eased }) }));
  const go = el('button', { class: 'btn btn-primary', type: 'button', text: t('derail.go') });
  go.addEventListener('click', () => closeModal());
  const right = el('div', { class: 'sheet' },
    el('p', { class: 'event-text', text: t('derail.text') }), list,
    el('p', { class: 'muted small', text: t('derail.tip') }), go);
  openModal(el('div', { class: 'event-body' }, art('derail'), right), { title: t('derail.title'), lock: true, cls: 'event-card', onClose: onDone });
}
