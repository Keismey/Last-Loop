// Aléatoire à graine (mulberry32). L'état tient dans un entier : il est sauvegardé avec la partie.
export function rngNext(holder) {
  let a = (holder.rngState = (holder.rngState + 0x6D2B79F5) | 0);
  let x = Math.imul(a ^ (a >>> 15), 1 | a);
  x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
}

// Générateur autonome pour le décor (ne touche pas à la partie)
export function makeRng(seed) {
  const holder = { rngState: seed | 0 };
  return () => rngNext(holder);
}

export function newSeed() {
  return (Math.random() * 2 ** 31) | 0;
}
