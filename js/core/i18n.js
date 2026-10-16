// Accès aux textes : t('cle', { param: valeur })
import { TEXTS } from '../data/texts.fr.js';

export function t(key, params) {
  let s = TEXTS[key];
  if (s === undefined) return key;
  if (Array.isArray(s)) return s;
  if (params) s = s.replace(/\{(\w+)\}/g, (m, k) => (params[k] !== undefined ? params[k] : m));
  return s;
}

// Formate un nombre à la française (espaces fines pour les milliers)
export function num(n) {
  return Math.floor(n).toLocaleString('fr-FR');
}

// Durée de jeu lisible
export function duration(sec) {
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return t('time.format', { h, m: String(m).padStart(2, '0') });
  return t('time.formatShort', { m, s: String(s).padStart(2, '0') });
}
