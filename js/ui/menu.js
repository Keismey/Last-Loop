// Menu de pause : reprendre, export / import, nouvelle partie, version (7 touchers = debug).
import { t, duration } from '../core/i18n.js';
import { CONFIG } from '../data/config.js';
import { openModal, closeModal, el } from './modal.js';
import { toast } from './toasts.js';
import { exportText, importText } from '../core/save.js';
import { settings, setSetting } from '../core/settings.js';
import { sfx } from '../audio/sound.js';
import { PATCH_NOTES } from '../data/patchnotes.fr.js';

// api : { getState, onResume, onImport(state), onTitle, onDebug, tryFullscreen }
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

  const content = el('div', { class: 'menu-list menu-grid' },
    el('p', { class: 'muted span-2', text: t('menu.playTime', { t: duration(api.getState().stats.playTime) }) }),
    el('button', { class: 'btn btn-primary span-2', text: t('menu.resume'), onclick: () => closeModal() }),
    el('button', { class: 'btn', text: t('menu.export'), onclick: () => openExport(api) }),
    el('button', { class: 'btn', text: t('menu.import'), onclick: () => openImport(api) }),
    optionsBlock(),
    el('button', { class: 'btn', text: t('menu.fullscreen'), onclick: () => api.tryFullscreen() }),
    el('button', { class: 'btn', text: t('menu.toTitle'), onclick: () => { closeModal(); api.onTitle(); } }),
    el('button', { class: 'btn', text: t('menu.notes'), onclick: () => openNotes(() => openMenu(api)) }),
    el('button', { class: 'btn', text: t('menu.credits'), onclick: () => openCredits(() => openMenu(api)) }),
    el('div', { class: 'span-2 version-row' }, version)
  );
  openModal(content, { title: t('menu.title'), onClose: api.onResume });
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
    el('div', { class: 'credits-list' }, line('credits.studio'), line('credits.claude'), line('credits.gemini')),
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

function openImport(api) {
  const area = el('textarea', { class: 'code-area', id: 'import-text', rows: '4', placeholder: t('import.placeholder') });
  const msg = el('p', { class: 'form-error', role: 'alert' });
  const go = el('button', { class: 'btn btn-primary', text: t('import.go') });
  go.addEventListener('click', () => {
    const res = importText(area.value);
    if (!res.ok) {
      msg.textContent = t('import.' + res.reason);
      return;
    }
    api.onImport(res.state);
    toast(t('import.ok'));
    closeModal();
  });
  openModal(el('div', { class: 'menu-list' },
    el('p', { text: t('import.body') }), area, msg, go), { title: t('import.title'), onClose: api.onResume });
}

// Options : volumes, vibrations, conseils de Gus (gardés hors de la sauvegarde)
function optionsBlock() {
  const box = el('div', { class: 'span-2 options' });
  const slider = (key, label) => {
    const input = el('input', { type: 'range', min: '0', max: '100', step: '5', value: String(Math.round(settings[key] * 100)), 'aria-label': label });
    const val = el('span', { class: 'num opt-val', text: Math.round(settings[key] * 100) + ' %' });
    input.addEventListener('input', () => { setSetting(key, input.value / 100); val.textContent = input.value + ' %'; });
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
