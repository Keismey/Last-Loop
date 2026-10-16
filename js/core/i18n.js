// Langue et textes : t('cle', { param: valeur })
// Langue : ?lang=fr|en (liens du hub, bouton du menu), retenue ; sinon le dernier choix ; sinon celle de l'appareil.
import { TEXTS as FR } from '../data/texts.fr.js';
import { TEXTS as EN } from '../data/texts.en.js';
import { PLACE_EN } from '../data/places.en.js';

const LANG_KEY = 'lastloop.lang';
export const LANG = (() => {
  let l = null;
  try { l = new URLSearchParams(location.search).get('lang'); } catch (e) { /* hors navigateur */ }
  try {
    if (l === 'fr' || l === 'en') localStorage.setItem(LANG_KEY, l);
    else l = localStorage.getItem(LANG_KEY);
  } catch (e) { /* stockage indisponible */ }
  if (l !== 'fr' && l !== 'en') l = typeof navigator !== 'undefined' && /^fr/i.test(navigator.language || '') ? 'fr' : 'en';
  return l;
})();
export const IS_EN = LANG === 'en';
export const LOCALE = IS_EN ? 'en-GB' : 'fr-FR';
const TEXTS = IS_EN ? EN : FR;
if (typeof document !== 'undefined') document.documentElement.lang = LANG;

// Change de langue : recharge la page avec ?lang= (la partie est sauvegardée à la sortie de page)
export function switchLang() {
  const u = new URL(location.href);
  u.searchParams.set('lang', IS_EN ? 'fr' : 'en');
  location.replace(u.toString());
}

export function t(key, params) {
  let s = TEXTS[key];
  if (s === undefined) s = FR[key];          // texte pas encore traduit : le français plutôt que la clé
  if (s === undefined) return key;
  if (Array.isArray(s)) return s;
  if (params) s = s.replace(/\{(\w+)\}/g, (m, k) => (params[k] === undefined ? m : IS_EN && PLACE_EN[params[k]] ? PLACE_EN[params[k]] : params[k]));
  return s;
}

// Nombre entier selon la langue (espaces fines pour les milliers en français)
export function num(n) {
  return Math.floor(n).toLocaleString(LOCALE);
}
// Nombre à une décimale au plus (virgule en français, point en anglais)
export function dec(v, digits = 1) {
  const k = Math.pow(10, digits);
  return (Math.round(v * k) / k).toLocaleString(LOCALE, { maximumFractionDigits: digits });
}
// Décimale fixe (« 2,0 » / « 2.0 »)
export function fixed(v, digits = 1) {
  const s = Number(v).toFixed(digits);
  return IS_EN ? s : s.replace('.', ',');
}
// Pourcentage : « 12 % » en français, « 12% » en anglais
export function pct(n) {
  return IS_EN ? n + '%' : n + ' %';
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
