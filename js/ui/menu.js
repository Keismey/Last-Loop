// Menu de pause : reprendre, sauvegarde (fenêtre commune du studio), nouvelle partie, version (7 touchers = debug).
import { t, duration, pct, switchLang, IS_EN } from '../core/i18n.js';
import { CONFIG } from '../data/config.js';
import { openModal, closeModal, el } from './modal.js';
import { toast } from './toasts.js';
import { exportText, legacySave } from '../core/save.js';
import { settings, setSetting } from '../core/settings.js';
import { sfx } from '../audio/sound.js';
import { PATCH_NOTES } from '../data/patchnotes.js';

// api : { getState, onResume, onSave, onTitle, onDebug, tryFullscreen, atTitle }
// atTitle : ouvert depuis l'écran titre (Options) : ni temps de jeu, ni sauvegarde, ni « Écran titre » (la croix ferme)
export function openMenu(api) {
  let taps = 0;
  const version = el('button', { class: 'version-btn', text: t('menu.version', { v: CONFIG.VERSION }) });
  if (CONFIG.DEBUG_ALLOWED) version.addEventListener('click', () => {
    taps += 1;
    const left = CONFIG.DEBUG_TAPS - taps;
    if (left <= 0) {
      api.onDebug();
      toast(t('menu.debugOn'));
      taps = 0;
    } else if (left <= 3) {
      toast(left === 1 ? t('menu.debugTapsLeft1') : t('menu.debugTapsLeft', { n: left }));
    }
  });

  const T = !!api.atTitle;
  const lang = IS_EN ? 'en' : 'fr';
  const content = el('div', { class: 'menu-list menu-grid' },
    T ? null : el('p', { class: 'muted span-2', text: t('menu.playTime', { t: duration(api.getState().stats.playTime) }) }),
    T ? null : el('button', { class: 'btn btn-primary span-2', text: t('menu.resume'), onclick: () => closeModal() }),
    optionsBlock(),
    el('button', { class: 'btn btn-lang' + (T ? '' : ' span-2'), lang: IS_EN ? 'fr' : 'en', text: t('menu.lang'), onclick: () => { api.onLang ? api.onLang() : switchLang(); } }),
    T ? null : el('button', { class: 'btn span-2', text: t('menu.save'), onclick: () => api.onSave() }),
    el('button', { class: 'btn', text: t('menu.fullscreen'), onclick: () => api.tryFullscreen() }),
    el('button', { class: 'btn', text: t('menu.notes'), onclick: () => openNotes(() => openMenu(api)) }),
    el('button', { class: 'btn', text: t('menu.credits'), onclick: () => openCredits(() => openMenu(api)) }),
    T ? null : el('button', { class: 'btn', text: t('menu.toTitle'), onclick: () => { closeModal(); api.onTitle(); } }),
    el('button', { class: 'btn', text: t('menu.bug'), onclick: () => { if (window.KS) window.KS.bug('Last Loop', lang); } }),
    el('button', { class: 'btn', text: t('menu.support'), onclick: () => { if (window.KS) window.KS.support(); } }),
    el('button', { class: 'btn span-2', text: t('menu.hub'), onclick: () => { if (api.onHub) api.onHub(); if (window.KSBack) window.KSBack.toHub(); } }),
    el('div', { class: 'span-2 version-row' }, version)
  );
  openModal(content, { title: T ? t('menu.options') : t('menu.title'), onClose: api.onResume });
}

// Nouveautés : les notes de mise à jour, les plus récentes d'abord
export function openNotes(onClose) {
  const list = el('div', { class: 'notes-list' });
  for (const n of PATCH_NOTES) {
    const h = el('h3', { text: n.title });
    h.append(el('small', { text: t('notes.version', { v: n.v }) }));
    const ul = el('ul');
    for (const it of n.items) ul.append(el('li', { text: it }));
    list.append(el('section', {}, h, ul));
  }
  openModal(list, { title: t('notes.title'), onClose });
}

// Crédits (écran titre et menu) ; onClose : retour au menu
export function openCredits(onClose) {
  const line = (k, cls = '') => el('p', { class: cls, text: t(k) });
  const content = el('div', { class: 'credits' },
    el('h3', { class: 'credits-game', text: t('credits.game') }),
    line('credits.by', 'muted'),
    el('div', { class: 'credits-list' }, line('credits.studio'), line('credits.claude')),
    line('credits.save', 'muted small'),
    line('credits.stats', 'muted small'),
    line('credits.thanks', 'credits-thanks'),
    el('p', { class: 'muted small', text: t('menu.version', { v: CONFIG.VERSION }) })
  );
  openModal(content, { title: t('credits.title'), onClose });
}

export function openExport(api, onClose) {
  const text = exportText(api.getState());
  const area = el('textarea', { class: 'code-area', id: 'export-text', readonly: 'readonly', rows: '4' });
  area.value = text;
  const copy = el('button', { class: 'btn btn-primary', text: t('export.copy') });
  copy.addEventListener('click', () => {
    const fallback = () => {
      area.focus();
      area.select();
      toast(t('export.copyFailed'), 'warn');
    };
    try {
      navigator.clipboard.writeText(text).then(() => toast(t('export.copied')), fallback);
    } catch (e) {
      fallback();
    }
  });
  openModal(el('div', { class: 'menu-list' },
    el('p', { text: t('export.body') }), area, copy), { title: t('export.title'), onClose: onClose || api.onResume });
}

// Fenêtre « Sauvegarde » commune du studio (ks-studio.js : code KS1 ou fichier, synchro du compte du hub).
// Les anciens codes « LOOPX1: » restent acceptés : traduits en code KS1 juste avant que la fenêtre ne les lise.
// o : { save(), onClose() } ; onClose quand la fenêtre se ferme (ou que la page se recharge pour l'import)
export function openSaveDialog(o) {
  const KS = window.KS;
  if (!KS || !KS.saveDialog) return false;
  KS.saveDialog({ lang: IS_EN ? 'en' : 'fr', keys: [CONFIG.SAVE_KEY, CONFIG.SAVE_KEY + '.bak'], save: o.save, file: 'last-loop', accent: '#c4a465' });
  const dlg = document.getElementById('ks-dlg');
  if (!dlg) return false;
  const area = dlg.querySelector('#ks-in'), go = dlg.querySelector('#ks-go'), msg = dlg.querySelector('#ks-msg');
  if (area && go) go.addEventListener('click', e => {
    const code = area.value.replace(/\s+/g, '');
    if (!code || code.startsWith('KS1.')) return;
    const res = legacySave(code);
    if (res.ok) {
      const dir = location.pathname.split('/')[1] || '';   // même dossier que ks-studio.js
      const data = { [res.keys[0]]: res.text, [res.keys[1]]: null };
      area.value = 'KS1.' + dir + '.' + btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    } else if (res.reason === 'tooNew' && msg) {
      e.stopImmediatePropagation();
      msg.textContent = t('import.tooNew');
      msg.hidden = false;
    }
  }, true);
  // au clavier : le focus entre dans la fenêtre (après le retour du focus de la fenêtre du jeu), puis revient au jeu
  setTimeout(() => { const f = dlg.querySelector('#ks-copy') || area; if (f && dlg.isConnected) f.focus({ preventScroll: true }); }, 0);
  const watch = new MutationObserver(() => {
    if (dlg.isConnected) return;
    watch.disconnect();
    o.onClose();
  });
  watch.observe(document.body, { childList: true });
  return true;
}

// Options : volumes, vibrations, conseils de Gus (gardés hors de la sauvegarde)
function optionsBlock() {
  const box = el('div', { class: 'span-2 options' });
  const slider = (key, label) => {
    const input = el('input', { type: 'range', min: '0', max: '100', step: '5', value: String(Math.round(settings[key] * 100)), 'aria-label': label });
    const val = el('span', { class: 'num opt-val', text: pct(Math.round(settings[key] * 100)) });
    input.addEventListener('input', () => { setSetting(key, input.value / 100); val.textContent = pct(input.value); });
    if (key === 'sfx') input.addEventListener('change', () => sfx('coin'));
    return el('label', { class: 'opt-row' }, el('span', { text: label }), input, val);
  };
  const toggle = (key, label) => {
    const b = el('button', { class: 'chip opt-toggle' + (settings[key] ? ' on' : ''), type: 'button', 'aria-pressed': String(!!settings[key]), text: settings[key] ? t('opt.on') : t('opt.off') });
    b.addEventListener('click', () => {
      setSetting(key, !settings[key]);
      b.classList.toggle('on', settings[key]);
      b.setAttribute('aria-pressed', String(settings[key]));
      b.textContent = settings[key] ? t('opt.on') : t('opt.off');
    });
    return el('div', { class: 'opt-row' }, el('span', { text: label }), b);
  };
  box.append(slider('music', t('opt.music')), slider('sfx', t('opt.sfx')), toggle('vibrate', t('opt.vibrate')), toggle('tips', t('opt.tips')));
  return box;
}
