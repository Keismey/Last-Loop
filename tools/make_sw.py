# Écrit sw.js (service worker de Last Loop) avec la liste des fichiers du jeu à garder hors ligne.
import os, re, json
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ver = re.search(r"VERSION: '([^']+)'", open(ROOT + '/js/data/config.js').read()).group(1)
files = ['./', 'index.html', 'manifest.webmanifest']
for d in ('css', 'js', 'assets/img', 'assets/icons'):  # outils, notes et musiques exclus
    for base, _, fs in os.walk(os.path.join(ROOT, d)):
        for f in sorted(fs):
            files.append(os.path.relpath(os.path.join(base, f), ROOT))
sw = """// Last Loop : service worker (généré à chaque mise en ligne, version %(ver)s).
// Pages, code et styles : réseau d'abord (les mises à jour arrivent tout de suite), cache si hors ligne.
// Images : cache d'abord, rafraîchies en fond. Musiques : gardées en cache à la première écoute.
const VERSION = '%(ver)s';
const CODE = 'lastloop-code-' + VERSION;
const MEDIA = 'lastloop-media';
const FILES = %(files)s;

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const code = await caches.open(CODE), media = await caches.open(MEDIA);
    await Promise.all(FILES.map(f => (/^assets\\//.test(f) ? media : code).add(f).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('lastloop-code-') && k !== CODE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const path = url.pathname;
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
      const hit = await media.match(req, { ignoreSearch: true });
      const net = fetch(req).then(r => { if (r.ok) media.put(req, r.clone()); return r; });
      if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
      return net;
    })());
    return;
  }
  e.respondWith((async () => {
    const code = await caches.open(CODE);
    try {
      const r = await fetch(req);
      if (r.ok) code.put(req, r.clone());
      return r;
    } catch (err) {
      return (await code.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' && await code.match('./')) || Response.error();
    }
  })());
});
""" % {'ver': ver, 'files': json.dumps(files, indent=0).replace('\n', ' ')}
open(ROOT + '/sw.js', 'w').write(sw)
print('sw.js', ver, len(files), 'fichiers')
