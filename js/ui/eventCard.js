// Carte d'événement (GDD §7) : illustration, récit, 2 ou 3 choix. Le jeu est en pause tant qu'elle est ouverte ;
// après le choix, le résultat s'affiche et « Continuer » relance le train.
import { t } from '../core/i18n.js';
import { el, openModal, closeModal } from './modal.js';
import { icon } from './icons.js';
import { buzz } from './toasts.js';
import { costEl } from './stationPanel.js';
import { getImage } from '../render/assets.js';
import { EVENTS } from '../data/events.js';
import { choiceState, resolveEvent } from '../sim/events.js';

// Illustration : l'image Gemini si elle existe, sinon un ciel de couleur et un pictogramme
const SKY = {
  survivor: ['#d9a35a', '#7a4a33', 'crew'], convoy: ['#c7a06b', '#5b4a44', 'scrap'], merchant: ['#e2b866', '#7d5a3a', 'trade'],
  storm: ['#5e6b78', '#2b2f3a', 'bolt'], mechanic: ['#c99a5a', '#5a4237', 'wrench'], rail: ['#bda27a', '#55473f', 'train'],
  warehouse: ['#d8b071', '#6a4c37', 'food'], epidemic: ['#8f9a76', '#3c4236', 'heart'], map: ['#cdb48a', '#5d4d3e', 'map'],
  overheat: ['#e08a45', '#5a2f24', 'fuel'],
  derail: ['#c9773f', '#3a2a28', 'train']
};

export function art(id) {
  const box = el('div', { class: 'event-art' });
  const img = getImage('ev_' + id);
  if (img) {
    box.appendChild(el('img', { src: img.src, alt: '' }));
    return box;
  }
  const [top, bottom, ico] = SKY[id] || ['#b89a6a', '#4a3d36', 'question'];
  box.style.background = `linear-gradient(180deg, ${top} 0%, ${bottom} 78%)`;
  const glyph = el('div', { class: 'event-glyph' });
  glyph.innerHTML = icon(ico);
  box.appendChild(glyph);
  return box;
}

const lootText = got => Object.entries(got || {}).filter(([, v]) => v > 0).map(([r, v]) => `+${v} ${t('res.' + r)}`).join(', ');

export function openEvent(getState, ev, { onDone }) {
  const id = ev.id;
  const state = getState();
  const text = el('p', { class: 'event-text', text: t('ev.' + id + '.text') });
  const choices = el('div', { class: 'event-choices' });
  EVENTS[id].choices.forEach((ch, i) => {
    const cs = choiceState(state, id, ch.id);
    const sub = cs.reason === 'bed' ? t('ev.needBed') : cs.reason === 'savoir' ? t('ev.needSavoir') : t(`ev.${id}.${ch.id}.sub`);
    const b = el('button', { class: 'event-choice' + (i === 0 ? ' first' : ''), type: 'button', disabled: cs.ok ? null : 'disabled' },
      el('strong', { text: t(`ev.${id}.${ch.id}`) }), el('span', { text: sub }));
    if (ch.cost) b.querySelector('strong').append(' ', costEl(ch.cost));
    b.addEventListener('click', () => {
      const res = resolveEvent(getState(), ch.id);
      if (!res) return;
      buzz(15);
      const p = { ...res.params, loot: lootText(res.params.got) };
      const done = el('button', { class: 'btn btn-primary', type: 'button', text: t('ev.continue') });
      done.addEventListener('click', () => closeModal());
      right.replaceChildren(el('p', { class: 'event-result', text: t(res.key, p) }), done);
    });
    choices.appendChild(b);
  });
  const right = el('div', { class: 'sheet' }, text, choices);
  const body = el('div', { class: 'event-body' }, art(id), right);
  openModal(body, { title: t('ev.' + id + '.title'), lock: true, cls: 'event-card', onClose: onDone });
}
