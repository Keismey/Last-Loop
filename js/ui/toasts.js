import { settings } from '../core/settings.js';
// Notifications courtes (GDD §14.8) : 2 au plus à l'écran, 2,5 s chacune.
let box;

export function initToasts(el) {
  box = el;
}

export function toast(text, kind = 'info') {
  if (!box) return;
  while (box.children.length >= 2) box.firstElementChild.remove();
  const el = document.createElement('div');
  el.className = 'toast toast-' + kind;
  el.textContent = text;
  el.setAttribute('role', 'status');
  box.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 300);
  }, 2500);
}

// Vibration courte, si l'appareil et les réglages le permettent
export function buzz(pattern) {
  if (!settings.vibrate) return;
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* non supporté */ }
}
