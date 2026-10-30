// Fenêtres dans la page (le navigateur de l'artefact n'affiche ni alert ni confirm).
import { icon } from './icons.js';
import { t } from '../core/i18n.js';

let layer;
let onCloseCb = null;
let locked = false;    // carte d'événement : il faut choisir, pas de fermeture en touchant à côté
let opener = null;     // bouton qui a ouvert la fenêtre : il reprend le focus à la fermeture

export function initModal(el) {
  layer = el;
  layer.addEventListener('pointerdown', e => {
    if (e.target === layer && !locked) closeModal();
  });
  document.addEventListener('keydown', trapTab, true);
}

// Clavier : Tab et Maj+Tab restent dans la fenêtre ouverte (Échap est traité par ks-back.js)
function focusables(card) {
  return [...card.querySelectorAll('button, [href], input, select, textarea, [tabindex]')]
    .filter(e => e.tabIndex >= 0 && !e.disabled && e.getClientRects().length);
}
function trapTab(e) {
  if (e.key !== 'Tab' || !isModalOpen()) return;
  const card = layer.querySelector('.modal-card');
  if (!card) return;
  const list = focusables(card), a = document.activeElement;
  if (!list.length) { e.preventDefault(); card.focus(); return; }
  const first = list[0], last = list[list.length - 1];
  if (!card.contains(a) || a === card) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
  else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
}

export function isModalOpen() {
  return layer && !layer.hidden;
}

// carte d'événement ou de déraillement : il faut choisir
export function isModalLocked() {
  return isModalOpen() && locked;
}

// content : élément DOM ; options : { title, onClose }
export function openModal(content, { title = '', onClose = null, lock = false, cls = '' } = {}) {
  // une fenêtre qui en remplace une autre (Crédits depuis le menu) garde le bouton d'origine
  const a = document.activeElement;
  if (!isModalOpen() && a && a !== document.body) opener = a;
  locked = lock;
  layer.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'modal-card' + (cls ? ' ' + cls : '');
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  card.setAttribute('aria-labelledby', 'modal-title');
  card.tabIndex = -1;
  const head = document.createElement('div');
  head.className = 'modal-head';
  const h = document.createElement('h2');
  h.id = 'modal-title';
  h.textContent = title;
  const x = document.createElement('button');
  x.className = 'icon-btn';
  x.innerHTML = icon('close');
  x.type = 'button';
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
  // le focus entre dans la fenêtre : le lecteur d'écran annonce son titre, Tab part de là
  try { card.focus({ preventScroll: true }); } catch (e) { /* sans conséquence */ }
}

export function closeModal() {
  if (!layer || layer.hidden) return;
  layer.hidden = true;
  layer.innerHTML = '';
  locked = false;
  const cb = onCloseCb;
  onCloseCb = null;
  if (cb) cb();
  // retour au bouton d'origine, s'il est encore là (sinon le jeu a changé d'écran) et qu'aucune fenêtre n'a pris la suite
  const b = opener;
  if (isModalOpen()) return;
  opener = null;
  if (b && b.isConnected && b.getClientRects().length && !b.disabled) try { b.focus({ preventScroll: true }); } catch (e) { /* sans conséquence */ }
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
