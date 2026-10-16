// Icônes SVG dessinées par le code (GDD §15.2) : grille 24 × 24, contour encre, une couleur.
import { AVAILABLE } from '../data/assets.js';
const INK = '#2B2A33';
const svg = (body, label) =>
  `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="${label ? 'false' : 'true'}" ${label ? `role="img" aria-label="${label}"` : ''}>${body}</svg>`;
const st = `stroke="${INK}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"`;

const shapes = {
  fuel: `<path d="M12 2.5c1 3.2 5.5 5.6 5.5 10.5a5.5 5.5 0 0 1-11 0c0-2.4 1.3-3.9 2.4-5.1.2 1.6.9 2.6 2 3.1-.3-3.4.2-6 1.1-8.5z" fill="#E8A33D" ${st}/><path d="M12 13.5c.6 1.3 2.3 2 2.3 3.8a2.3 2.3 0 0 1-4.6 0c0-1.3.9-2.3 2.3-3.8z" fill="#F2C14E" ${st}/>`,
  food: `<path d="M12 21.5V8" fill="none" ${st}/><g fill="#9cb36b" ${st}><ellipse cx="9.4" cy="9" rx="2" ry="3.2" transform="rotate(-28 9.4 9)"/><ellipse cx="14.6" cy="9" rx="2" ry="3.2" transform="rotate(28 14.6 9)"/><ellipse cx="9.4" cy="14" rx="2" ry="3.2" transform="rotate(-28 9.4 14)"/><ellipse cx="14.6" cy="14" rx="2" ry="3.2" transform="rotate(28 14.6 14)"/><ellipse cx="12" cy="5" rx="1.8" ry="3"/></g>`,
  scrap: `<path d="M12 2.8l7.8 4.6v9.2L12 21.2l-7.8-4.6V7.4z" fill="#a39a9e" ${st}/><circle cx="12" cy="12" r="3.4" fill="#5c5358" ${st}/>`,
  ammo: `<path d="M9 9.5h6v11H9z" fill="#c98f3e" ${st}/><path d="M9 9.5c0-4 1.5-6.5 3-7 1.5.5 3 3 3 7z" fill="#B5562B" ${st}/><path d="M8.2 18h7.6" ${st}/>`,
  parts: `<path d="M10.3 2.8h3.4l.6 2.6 2.2 1 2.3-1.4 2.4 2.4-1.4 2.3 1 2.2 2.6.6v3.4l-2.6.6-1 2.2 1.4 2.3-2.4 2.4-2.3-1.4-2.2 1-.6 2.6h-3.4l-.6-2.6-2.2-1-2.3 1.4-2.4-2.4 1.4-2.3-1-2.2-2.6-.6v-3.4l2.6-.6 1-2.2-1.4-2.3 2.4-2.4 2.3 1.4 2.2-1z" fill="#d9cfbf" ${st} transform="translate(12 12) scale(.82) translate(-12 -12)"/><circle cx="12" cy="12" r="3" fill="#6E6A6F" ${st}/>`,
  know: `<path d="M12 6.5C9.5 4.8 6 4.6 3 5.2v13c3-.6 6.5-.4 9 1.3 2.5-1.7 6-1.9 9-1.3v-13c-3-.6-6.5-.4-9 1.3z" fill="#6fb7b1" ${st}/><path d="M12 6.5v13" ${st} fill="none"/>`,
  keys: `<path d="M10.5 10.6h11v2.8h-1.6v3.2h-2.6v-3.2h-1.4v2.2h-2.6v-2.2h-2.8z" fill="#F2C14E" ${st}/><circle cx="7" cy="12" r="5" fill="#F2C14E" ${st}/><circle cx="7" cy="12" r="1.8" fill="${INK}"/>`,
  train: `<path d="M4 16V8.5h6V6h3v2.5h4l3 3.5V16z" fill="#B5562B" ${st}/><circle cx="7.5" cy="17.5" r="2" fill="#6E6A6F" ${st}/><circle cx="16.5" cy="17.5" r="2" fill="#6E6A6F" ${st}/>`,
  crew: `<circle cx="9" cy="8" r="3" fill="#EDE6D6" ${st}/><path d="M3.5 19.5c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5z" fill="#3E8E8A" ${st}/><circle cx="16.5" cy="9" r="2.4" fill="#EDE6D6" ${st}/><path d="M15 14.4c3 .1 5.5 1.9 5.5 5.1h-5" fill="#6fb7b1" ${st}/>`,
  research: `<path d="M9.5 3h5M10.5 3v6l-5 9.2c-.6 1.2.2 2.3 1.4 2.3h10.2c1.2 0 2-1.1 1.4-2.3l-5-9.2V3" fill="#EDE6D6" ${st}/><path d="M7.6 15h8.8l1.9 3.6c.2.5-.1.9-.6.9H6.3c-.5 0-.8-.4-.6-.9z" fill="#3E8E8A"/>`,
  log: `<path d="M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6z" fill="#B5562B" ${st}/><path d="M6 3v18M9.5 8h6M9.5 11.5h6" fill="none" ${st}/>`,
  map: `<path d="M3 6l6-2.5 6 2.5 6-2.5v14.5L15 20.5 9 18l-6 2.5z" fill="#EDE6D6" ${st}/><path d="M9 3.5V18M15 6v14.5" fill="none" ${st}/><circle cx="12" cy="11" r="2.2" fill="none" stroke="#C8382D" stroke-width="1.6"/>`,
  menu: `<path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="#EDE6D6" stroke-width="2.2" stroke-linecap="round"/>`,
  clock: `<circle cx="12" cy="12" r="8.5" fill="none" stroke="#EDE6D6" stroke-width="1.8"/><path d="M12 7v5.5l3.5 2" fill="none" stroke="#EDE6D6" stroke-width="1.8" stroke-linecap="round"/>`,
  zoom: `<circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="#EDE6D6" stroke-width="2"/><path d="M15.5 15.5l5 5M7.5 10.5h6" fill="none" stroke="#EDE6D6" stroke-width="2" stroke-linecap="round"/>`,
  bolt: `<path d="M13.5 2.5L5 13.5h6l-1.5 8 8.5-11h-6z" fill="#F2C14E" ${st}/>`,
  mec: `<path d="M14.5 3.5a5 5 0 0 0-4.6 6.8l-6.4 6.4a2 2 0 0 0 2.8 2.8l6.4-6.4a5 5 0 0 0 6.8-4.6l-3 3-2.8-.6-.6-2.8z" fill="#a39a9e" ${st}/>`,
  ter: `<path d="M12 3v10" fill="none" ${st}/><path d="M7.5 12.5h9l-1.2 6.2a3.3 3.3 0 0 1-6.6 0z" fill="#8c8287" ${st}/><path d="M10 3h4" fill="none" ${st}/>`,
  com: `<circle cx="12" cy="12" r="7" fill="none" stroke="#C8382D" stroke-width="2"/><path d="M12 2.5v5M12 16.5v5M2.5 12h5M16.5 12h5" fill="none" stroke="#C8382D" stroke-width="2" stroke-linecap="round"/>`,
  sav: `<path d="M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z" fill="#F2C14E" ${st}/><path d="M9.5 19h5M10.5 21.5h3" fill="none" ${st}/>`,
  heart: `<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" fill="#C8382D" ${st}/>`,
  smile: `<circle cx="12" cy="12" r="8.5" fill="#E8A33D" ${st}/><path d="M8.5 13.5c1 1.8 2.2 2.6 3.5 2.6s2.5-.8 3.5-2.6" fill="none" ${st}/><circle cx="9.3" cy="9.8" r="1" fill="${INK}"/><circle cx="14.7" cy="9.8" r="1" fill="${INK}"/>`,
  auto: `<path d="M5 12a7 7 0 0 1 12-4.9M19 12a7 7 0 0 1-12 4.9" fill="none" stroke="#2B2A33" stroke-width="2.2" stroke-linecap="round"/><path d="M17.5 3.5v4h-4M6.5 20.5v-4h4" fill="none" stroke="#2B2A33" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
  site_field: `<path d="M3 18h18" fill="none" ${st}/><path d="M6 18c0-4 1-6 2-8M10 18c0-5 1-8 2-10M14 18c0-4 1-7 2-9M18 18c0-3 .6-5 1.4-6" fill="none" stroke="#8fae4f" stroke-width="2" stroke-linecap="round"/>`,
  site_forest: `<path d="M8 3l-5 9h3l-3 5h10l-3-5h3z" fill="#6b7f4e" ${st}/><path d="M8 17v4" ${st}/><path d="M17 7l-4 7h2.5l-2.5 4h8l-2.5-4H21z" fill="#8a9a5c" ${st}/><path d="M17 18v3" ${st}/>`,
  site_mine: `<path d="M4 21l5-15 5 15M6.5 14h5" fill="none" stroke="#7a5c40" stroke-width="2" stroke-linejoin="round"/><circle cx="9" cy="6" r="2.4" fill="#B5562B" ${st}/><path d="M13 21c1-3 3-4.5 5-4.5s3.5 1.5 4 4.5z" fill="#2f2b30" ${st}/>`,
  site_junkyard: `<path d="M3 19l2-5h8l3 3h4v2z" fill="#B5562B" ${st}/><circle cx="7" cy="19.5" r="1.8" fill="#6E6A6F" ${st}/><circle cx="16" cy="19.5" r="1.8" fill="#6E6A6F" ${st}/><path d="M6 14l2-4h4l1 4" fill="#a39a9e" ${st}/>`,
  site_ruins: `<path d="M3 21V10l4-3v4l3-2v12zM12 21v-8l4-2 1 3 4-1v8z" fill="#8c8287" ${st}/>`,
  site_station: `<path d="M3 20h18M5 20v-8h14v8" fill="none" ${st}/><path d="M3 12l3-5h12l3 5z" fill="#C8382D" ${st}/><rect x="9" y="14" width="6" height="6" fill="#E8A33D" ${st}/>`,
  site_fortress: `<path d="M3 21V9h3v2h3V9h3v2h3V9h3v2h3V9h0v12z" fill="#4a4247" ${st}/><path d="M10 21v-4a2 2 0 0 1 4 0v4" fill="#2b2a33" ${st}/>`,
  site_camp: `<path d="M2.5 20L9 8l6.5 12z" fill="#c9a15c" ${st}/><path d="M9 20l0-5" ${st}/><path d="M14 20l4.5-8 4 8z" fill="#B5562B" ${st}/>`,
  site_depot: `<path d="M3 21V10l9-6 9 6v11z" fill="#8f4426" ${st}/><path d="M8 21v-5a4 4 0 0 1 8 0v5" fill="#2f2b30" ${st}/>`,
  lock: `<rect x="5" y="10.5" width="14" height="10" rx="2" fill="#F2C14E" ${st}/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" ${st}/><circle cx="12" cy="15.5" r="1.5" fill="${INK}"/>`,
  skull: `<path d="M12 3a7.5 7.5 0 0 0-5 13.1V19a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-2.9A7.5 7.5 0 0 0 12 3z" fill="#EDE6D6" ${st}/><circle cx="9" cy="11.5" r="1.8" fill="${INK}"/><circle cx="15" cy="11.5" r="1.8" fill="${INK}"/><path d="M10 17.5v2M14 17.5v2M12 14l-1 1.8h2z" fill="${INK}" ${st}/>`,
  question: `<circle cx="12" cy="12" r="9" fill="#3a3842" ${st}/><path d="M9.3 9.3a2.8 2.8 0 1 1 3.9 2.6c-.8.4-1.2 1-1.2 1.9v.6" fill="none" stroke="#EDE6D6" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="17.2" r="1.2" fill="#EDE6D6"/>`,
  wrench: `<path d="M14.5 3.5a5 5 0 0 0-4.6 6.8l-6.4 6.4a2 2 0 0 0 2.8 2.8l6.4-6.4a5 5 0 0 0 6.8-4.6l-3 3-2.8-.6-.6-2.8z" fill="#C8382D" ${st}/>`,
  shield: `<path d="M12 2.8l7.5 3v5.6c0 4.6-3.2 8.3-7.5 9.8-4.3-1.5-7.5-5.2-7.5-9.8V5.8z" fill="#8c8287" ${st}/><path d="M12 2.8v18.4" fill="none" ${st}/>`,
  steam: `<path d="M4 15.5h11.5l3 3H4z" fill="#B5562B" ${st}/><path d="M7 15.5V11h5v4.5" fill="#6E6A6F" ${st}/><path d="M9 11V8M14.5 9.5c1.6-1 1.6-2.6 0-3.6s-1.6-2.6 0-3.6M18.5 10.5c1.6-1 1.6-2.6 0-3.6" fill="none" stroke="#EDE6D6" stroke-width="1.8" stroke-linecap="round"/>`,
  target: `<circle cx="12" cy="12" r="7.5" fill="none" stroke="#ff5a4a" stroke-width="2"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5" stroke="#ff5a4a" stroke-width="2" stroke-linecap="round"/>`,
  barrage: `<path d="M3 9.5h11l3 2.5-3 2.5H3z" fill="#c98f3e" ${st}/><path d="M6 5h9l2.5 2-2.5 2H6zM6 15h9l2.5 2-2.5 2H6z" fill="#B5562B" ${st}/><path d="M19.5 7.5h2M20 12h2M19.5 16.5h2" stroke="#F2C14E" stroke-width="1.8" stroke-linecap="round"/>`,
  trade: `<path d="M4 8h13l-3-3M20 16H7l3 3" fill="none" stroke="#EDE6D6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
  star: `<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z" fill="#F2C14E" ${st}/>`,
  close: `<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="#EDE6D6" stroke-width="2.2" stroke-linecap="round"/>`,
  phone: `<rect x="7" y="2.5" width="10" height="19" rx="2.2" fill="none" stroke="#EDE6D6" stroke-width="1.8"/><path d="M10.5 18.5h3" stroke="#EDE6D6" stroke-width="1.8" stroke-linecap="round"/>`
};

// Icônes en image (planches Gemini) : dès qu'un fichier assets/img/ico_<nom>.webp existe (liste AVAILABLE),
// il remplace le dessin du code. On garde une enveloppe <svg> pour que toutes les tailles CSS s'appliquent.
const IMG_ICONS = new Set([...AVAILABLE].filter(id => id.startsWith('ico_')).map(id => id.slice(4)));

export function icon(name, label) {
  if (IMG_ICONS.has(name)) {
    return `<svg viewBox="0 0 64 64" width="24" height="24" class="ico-img" aria-hidden="${label ? 'false' : 'true'}" ${label ? `role="img" aria-label="${label}"` : ''}>` +
      `<image href="assets/img/ico_${name}.webp" width="64" height="64" preserveAspectRatio="xMidYMid meet"/></svg>`;
  }
  return svg(shapes[name] || '', label);
}

// Toutes les icônes dessinées par le code (liste pour les planches d'icônes)
export const ICON_NAMES = Object.keys(shapes);
