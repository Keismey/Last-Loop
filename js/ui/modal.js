// Fenêtres dans la page (le navigateur de l'artefact n'affiche ni alert ni confirm).
import { icon } from './icons.js';
import { t } from '../core/i18n.js';

let layer;
let onCloseCb = null;
let locked = false;    // carte d'événement : il faut choisir, pas de fermeture en touchant à côté

export function initModal(el) {
  layer = el;
  layer.addEventListener('pointerdown', e => {
    if (e.target === layer && !locked) closeModal();
  });
}

export function isModalOpen() {
  return layer && !layer.hidden;
}

// content : élément DOM ; options : { title, onClose }
export function openModal(content, { title = '', onClose = null, lock = false, cls = '' } = {}) {
  locked = lock;
  layer.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'modal-card' + (cls ? ' ' + cls : '');
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  const head = document.createElement('div');
  head.className = 'modal-head';
  const h = document.createElement('h2');
  h.textContent = title;
  const x = document.createElement('button');
  x.className = 'icon-btn';
  x.innerHTML = icon('close');
  x.setAttribute('aria-label', t('common.close'));
  x.addEventListener('click', closeModal);
  head.append(h);
  if (!lock) head.append(x);
  const body = document.createElement('div');
  body.className = 'modal-body';
  body.appendChild(content);
  card.append(head, body);
  layer.appendChild(card);
  layer.hidden = false;
  onCloseCb = onClose;
}

export function closeModal() {
  if (!layer || layer.hidden) return;
  layer.hidden = true;
  layer.innerHTML = '';
  locked = false;
  const cb = onCloseCb;
  onCloseCb = null;
  if (cb) cb();
}

// Petit utilitaire de construction DOM
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v);
  }
  for (const c of children) if (c) node.append(c);
  return node;
}
