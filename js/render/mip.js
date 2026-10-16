// Dessin net des images à toutes les tailles (anti-pixelisation).
// Un canvas réduit mal une image plus de 2 fois : les contours fins « crénellent ».
// On prépare donc, à la demande, des versions divisées par 2, 4, 8… (mipmaps) avec un filtrage de qualité,
// et on dessine toujours à partir de la version juste plus grande que la taille affichée.
const levels = new WeakMap();

const widthOf = img => img.naturalWidth || img.width;
const heightOf = img => img.naturalHeight || img.height;

function halve(src) {
  const w = Math.max(1, Math.round(widthOf(src) / 2));
  const h = Math.max(1, Math.round(heightOf(src) / 2));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(src, 0, 0, w, h);
  return c;
}

// Renvoie la version de l'image adaptée à une largeur affichée (en pixels de l'écran)
export function mipFor(img, targetPx) {
  let list = levels.get(img);
  if (!list) {
    list = [img];
    levels.set(img, list);
  }
  let i = 0;
  for (;;) {
    const half = widthOf(list[i]) / 2;
    if (half < targetPx * 1.05 || half < 4) return list[i];
    if (!list[i + 1]) list[i + 1] = halve(list[i]);
    i += 1;
  }
}

// Comme ctx.drawImage(img, x, y, w, h), mais net quelle que soit l'échelle (transformations comprises)
export function drawSmooth(ctx, img, x, y, w, h) {
  const m = ctx.getTransform();
  const px = Math.abs(w) * Math.hypot(m.a, m.b);
  ctx.drawImage(mipFor(img, px), x, y, w, h);
}
