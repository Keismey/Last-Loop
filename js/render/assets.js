// Chargement des images. Une image absente n'est pas une erreur : le jeu dessine un remplaçant.
import { IMAGES, AVAILABLE } from '../data/assets.js';

const loaded = new Map();

export function getImage(id) {
  return loaded.get(id) || null;
}

function loadOne(entry) {
  return new Promise(resolve => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      loaded.set(entry.id, img);
      resolve(true);
    };
    img.onerror = () => resolve(false);
    img.src = entry.src;
  });
}

// Charge un groupe d'images et signale la progression (0 à 1)
export async function loadGroup(group, onProgress) {
  const entries = IMAGES.filter(e => e.group === group && AVAILABLE.has(e.id));
  let done = 0;
  onProgress && onProgress(entries.length ? 0 : 1);
  await Promise.all(entries.map(e => loadOne(e).then(() => {
    done += 1;
    onProgress && onProgress(done / entries.length);
  })));
  return entries.filter(e => loaded.has(e.id)).length;
}
