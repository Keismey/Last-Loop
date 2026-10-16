// Sous-onglets d'un panneau : les sections sont séparées pour éviter de défiler loin (Trocs, Services, Recrue…).
// L'onglet choisi est retenu par panneau (clé), même quand le contenu est reconstruit chaque seconde.
import { el } from './modal.js';
import { icon } from './icons.js';
import { refreshPanel } from './panels.js';

const memo = new Map();

// items : [{ id, label, icon?, badge?, hidden? }] ; renvoie { bar, active }
export function subTabs(key, items, def = null) {
  const vis = items.filter(i => !i.hidden);
  let active = memo.get(key);
  if (!vis.some(i => i.id === active)) active = vis.some(i => i.id === def) ? def : vis[0].id;
  const bar = el('div', { class: 'subtabs', role: 'tablist' });
  for (const it of vis) {
    const on = it.id === active;
    const b = el('button', { class: 'subtab' + (on ? ' on' : ''), type: 'button', role: 'tab', 'aria-selected': on ? 'true' : 'false' });
    if (it.icon) b.appendChild(el('span', { class: 'subtab-ico' })).innerHTML = icon(it.icon);
    b.appendChild(el('span', { class: 'subtab-label', text: it.label }));
    if (it.badge) b.appendChild(el('b', { class: 'subtab-badge' + (it.badge === '!' ? ' hot' : ''), text: String(it.badge) }));
    b.addEventListener('click', () => {
      if (memo.get(key) === it.id && on) return;
      memo.set(key, it.id);
      refreshPanel(true, true);
    });
    bar.appendChild(b);
  }
  return { bar, active };
}

// Ouvre un panneau sur un onglet précis (nouvelle gare : on repart des trocs)
export function setSubTab(key, id) {
  memo.set(key, id);
}
