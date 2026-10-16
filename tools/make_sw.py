# Écrit sw.js (service worker de Last Loop) avec la liste des fichiers du jeu à garder hors ligne.
import os, re, json, hashlib
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ver = re.search(r"VERSION: '([^']+)'", open(ROOT + '/js/data/config.js').read()).group(1)
files = ['./', 'index.html', 'manifest.webmanifest']
for d in ('css', 'js', 'assets/img', 'assets/icons'):  # outils, notes et musiques exclus
    for base, _, fs in os.walk(os.path.join(ROOT, d)):
        for f in sorted(fs):
            files.append(os.path.relpath(os.path.join(base, f), ROOT))
# Empreinte de chaque image : une image modifiée (même nom de fichier) est retéléchargée, les autres restent en cache
hashes = {f: hashlib.md5(open(os.path.join(ROOT, f), 'rb').read()).hexdigest()[:10] for f in files if f.startswith('assets/')}
sw = """// Last Loop : service worker (généré à chaque mise en ligne, version %(ver)s).
// Pages, code et styles : réseau d'abord (les mises à jour arrivent tout de suite), cache si hors ligne.
// Images : cache d'abord, rangées sous leur empreinte (une image changée est retéléchargée à la mise à jour).
// Musiques : gardées en cache à la première écoute.
const VERSION = '%(ver)s';
const CODE = 'lastloop-code-' + VERSION;
const MEDIA = 'lastloop-media';
const FILES = %(files)s;
const HASH = %(hashes)s;
const keyOf = f => f + '?h=' + HASH[f];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const code = await caches.open(CODE), media = await caches.open(MEDIA);
    // relus sans le cache HTTP du navigateur : jamais une vieille copie dans le cache hors ligne ;
    // images : seulement celles dont l'empreinte a changé
    await Promise.all(FILES.map(async f => {
      try {
        if (!HASH[f]) return await code.add(new Request(f, { cache: 'reload' }));
        if (await media.match(keyOf(f))) return;
        const r = await fetch(f, { cache: 'reload' });
        if (r.ok) await media.put(keyOf(f), r);
      } catch (err) { /* réessayé à la demande */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if ((k.startsWith('lastloop-code-') && k !== CODE)) await caches.delete(k);
    // images d'anciennes versions (empreinte périmée) : retirées
    const media = await caches.open(MEDIA), base = new URL(self.registration.scope).pathname;
    const keep = new Set(Object.keys(HASH).map(keyOf));
    for (const req of await media.keys()) {
      const u = new URL(req.url), rel = u.pathname.slice(base.length) + u.search;
      if (!/\\.mp3$/.test(u.pathname) && !keep.has(rel)) await media.delete(req);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const path = url.pathname;
  if (/version\\.json$/.test(path)) return;     // vérification de mise à jour : toujours le réseau
  // Musiques : le lecteur demande des morceaux (Range) ; on sert le fichier entier gardé en cache s'il existe
  if (/\\.mp3$/.test(path)) {
    e.respondWith((async () => {
      const media = await caches.open(MEDIA);
      const hit = await media.match(path);
      if (hit && !req.headers.has('range')) return hit;
      if (!hit) fetch(path).then(r => { if (r.ok && r.status === 200) media.put(path, r); }).catch(() => {});
      try { return await fetch(req); } catch (err) { return hit || Response.error(); }
    })());
    return;
  }
  if (/\\/assets\\//.test(path)) {
    e.respondWith((async () => {
      const media = await caches.open(MEDIA);
      const rel = path.slice(new URL(self.registration.scope).pathname.length);
      if (!HASH[rel]) return fetch(req);
      const hit = await media.match(keyOf(rel));
      if (hit) return hit;
      const r = await fetch(req, { cache: 'reload' });
      if (r.ok) media.put(keyOf(rel), r.clone());
      return r;
    })());
    return;
  }
  e.respondWith((async () => {
    const code = await caches.open(CODE);
    try {
      // revalidé à chaque ouverture (le cache HTTP de GitHub Pages ne fait pas attendre une mise à jour)
      const r = await fetch(req, { cache: 'no-cache' });
      if (r.ok) code.put(req, r.clone());
      return r;
    } catch (err) {
      return (await code.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' && await code.match('./')) || Response.error();
    }
  })());
});
""" % {'ver': ver, 'files': json.dumps(files, indent=0).replace('\n', ' '), 'hashes': json.dumps(hashes, separators=(',', ':'))}
open(ROOT + '/sw.js', 'w').write(sw)
print('sw.js', ver, len(files), 'fichiers')
