// Capacités du chef de train (GDD §6.5) : boutons ronds à droite de la scène, une par palier de locomotive.
// Anneau de recharge, état « active », grisé quand la capacité n'est pas disponible.
import { t } from '../core/i18n.js';
import { icon } from './icons.js';
import { el } from './modal.js';
import { toast, buzz } from './toasts.js';
import { abilityState, useAbility, unlockedAbilities } from '../sim/combat.js';
import { isHalte } from '../sim/route.js';
import { COMBAT } from '../data/enemies.js';

const ICONS = { fullsteam: 'steam', barrage: 'barrage' };
let refs = null;

export function initAbilities(box, { getState }) {
  box.innerHTML = '';
  refs = { box, getState, btns: {}, key: '' };
}

function build(state) {
  const box = refs.box;
  box.innerHTML = '';
  refs.btns = {};
  for (const id of unlockedAbilities(state)) {
    const A = COMBAT.abilities[id];
    const btn = el('button', { class: 'ability', type: 'button', 'aria-label': t('ability.' + id) },
      el('span', { class: 'ability-ico' }),
      el('span', { class: 'ability-cd num' }));
    btn.querySelector('.ability-ico').innerHTML = icon(ICONS[id] || 'steam');
    btn.addEventListener('click', () => {
      const res = useAbility(refs.getState(), id);
      if (res.ok) { toast(t('ability.' + id + 'On')); buzz([20, 30, 20]); }
      else if (res.reason === 'stopped') toast(t('ability.stopped'), 'warn');
      else if (res.reason === 'cooldown') toast(t('ability.cooldown'), 'warn');
      else if (res.reason === 'cost') toast(t('ability.cost', { n: (A.cost || {}).fuel || 0 }), 'warn');
    });
    box.appendChild(btn);
    refs.btns[id] = { btn, cd: btn.querySelector('.ability-cd') };
  }
}

export function updateAbilities() {
  if (!refs) return;
  const state = refs.getState();
  if (!state || !state.combat) return;
  const halte = isHalte(state);
  refs.box.hidden = halte;
  if (halte) return;
  const key = unlockedAbilities(state).join(',');
  if (key !== refs.key) { refs.key = key; build(state); }
  for (const [id, r] of Object.entries(refs.btns)) {
    const st = abilityState(state, id);
    const b = r.btn;
    b.classList.toggle('active', st.active);
    b.classList.toggle('cooling', !st.active && st.cd > 0);
    b.classList.toggle('dim', !st.ready && !st.active);
    const p = st.active ? st.left / st.dur : st.cd > 0 ? 1 - st.cd / st.cdMax : 1;
    b.style.setProperty('--p', (p * 100).toFixed(1) + '%');
    r.cd.textContent = st.active ? Math.ceil(st.left) : st.cd > 0 ? Math.ceil(st.cd) : '';
    const A = COMBAT.abilities[id];
    b.title = st.stopped ? t('ability.stopped') : t('ability.' + id + 'Tip', { n: (A.cost || {}).fuel || 0 });
  }
}
