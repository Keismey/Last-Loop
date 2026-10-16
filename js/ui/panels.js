// Panneaux latéraux (GDD §14.7) : glissent depuis la droite, 60 % de la largeur, le jeu continue derrière.
// Le contenu est reconstruit à intervalle régulier pour rester à jour.
import { icon } from './icons.js';
import { t } from '../core/i18n.js';

let host = null;
let current = null;   // { build, body }
let pressing = false; // doigt posé dans le panneau : on ne reconstruit pas sous lui (le toucher serait perdu)

export function initPanels(el) {
  host = el;
  host.addEventListener('pointerdown', e => { if (e.target === host) closePanel(); else pressing = true; });
  window.addEventListener('pointerup', () => { pressing = false; });
  window.addEventListener('pointercancel', () => { pressing = false; });
}

export function openPanel(title, build, opts = {}) {
  host.innerHTML = '';
  const card = document.createElement('aside');
  card.className = 'side-panel' + (opts.wide ? ' wide' : '');
  card.setAttribute('role', 'dialog');
  const head = document.createElement('div');
  head.className = 'panel-head';
  const h = document.createElement('h2');
  h.textContent = title;
  const x = document.createElement('button');
  x.className = 'icon-btn';
  x.type = 'button';
  x.innerHTML = icon('close');
  x.setAttribute('aria-label', t('sheet.close'));
  x.addEventListener('click', closePanel);
  // Retour au panneau précédent (liste d'équipage, atelier du train…)
  if (opts.back) {
    const bk = document.createElement('button');
    bk.className = 'icon-btn panel-back';
    bk.type = 'button';
    bk.innerHTML = '<span aria-hidden="true">‹</span>';
    bk.setAttribute('aria-label', t('sheet.back'));
    bk.addEventListener('click', () => opts.back());
    head.append(bk);
  }
  head.append(h, x);
  // Sous-onglets (fixes, ne défilent pas) : rangée entre le titre et le contenu
  const tabs = document.createElement('div');
  tabs.className = 'panel-tabs';
  tabs.hidden = true;
  const body = document.createElement('div');
  body.className = 'panel-body';
  const foot = document.createElement('div');
  foot.className = 'panel-foot';
  card.append(head, tabs, body, foot);
  host.appendChild(card);
  host.hidden = false;
  current = { build, body, foot, tabs, title: h, static: !!opts.static, tab: opts.tab || null };
  markTab(opts.tab || null);
  refreshPanel(true);
}

export function refreshPanel(force = false, toTop = false) {
  if (!current || (current.static && !force)) return;
  if (pressing && !force) return;
  const keep = toTop ? 0 : current.body.scrollTop;
  const res = current.build();
  if (res === null) { closePanel(); return; }
  const node = res.el || res;
  // Rien n'a changé : on garde les éléments en place (boutons stables sous le doigt)
  const html = node.outerHTML + (res.foot ? res.foot.outerHTML : '') + (res.tabs ? res.tabs.outerHTML : '');
  if (!force && current.html === html) return;
  current.html = html;
  current.body.replaceChildren(node);
  // Pied : les actions principales restent visibles sans défiler
  if (res.foot) current.foot.replaceChildren(res.foot); else current.foot.replaceChildren();
  if (res.tabs) current.tabs.replaceChildren(res.tabs); else current.tabs.replaceChildren();
  current.tabs.hidden = !res.tabs;
  if (res.title) current.title.textContent = res.title;
  current.body.scrollTop = keep;
}

export function closePanel() {
  if (!host) return;
  host.hidden = true;
  host.innerHTML = '';
  current = null;
  markTab(null);
}

// L'onglet du panneau ouvert est marqué dans le rail
function markTab(tab) {
  document.querySelectorAll('#tabs .tab').forEach(b => b.classList.toggle('open', !!tab && b.dataset.tab === tab));
}

export function openTab() {
  return current ? current.tab : null;
}

export function panelOpen() {
  return !!current;
}
