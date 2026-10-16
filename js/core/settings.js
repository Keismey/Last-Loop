// Réglages du joueur (Options) : volumes, vibrations, conseils de Gus. Gardés à part de la sauvegarde :
// effacer sa partie ne remet pas le son à fond.
const KEY = 'loopexpress.settings';
const DEFAULTS = { music: 0.6, sfx: 0.8, vibrate: true, tips: true };

export const settings = { ...DEFAULTS };

try {
  const raw = localStorage.getItem(KEY);
  if (raw) Object.assign(settings, JSON.parse(raw));
} catch (e) { /* stockage indisponible : réglages par défaut */ }

const listeners = new Set();
export const onSettings = fn => { listeners.add(fn); return () => listeners.delete(fn); };

export function setSetting(k, v) {
  settings[k] = v;
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (e) { /* tant pis : valable pour la session */ }
  for (const fn of listeners) fn(k, v);
}
