# Écrit sw.js (service worker de Last Loop) avec la liste des fichiers du jeu à garder hors ligne.
import os, re, json, hashlib
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ver = re.search(r"VERSION: '([^']+)'", open(ROOT + '/js/data/config.js').read()).group(1)
files = ['index.html', 'manifest.webmanifest']   # une seule copie de la page : « ./ » est servi par « index.html »
# Grandes icônes du manifeste (512 px, 400 Ko chacune) : seulement pour installer l'appli, le navigateur les demande lui-même
SKIP = {i['src'] for i in json.load(open(ROOT + '/manifest.webmanifest'))['icons'] if '512' in i.get('sizes', '')}
for d in ('css', 'js', 'assets/img', 'assets/icons'):  # outils, notes et musiques exclus
    for base, _, fs in os.walk(os.path.join(ROOT, d)):
        for f in sorted(fs):
            rel = os.path.relpath(os.path.join(base, f), ROOT)
            if rel not in SKIP: files.append(rel)
md5 = lambda f: hashlib.md5(open(os.path.join(ROOT, f), 'rb').read()).hexdigest()[:10]
# Empreinte de chaque image : une image modifiée (même nom de fichier) est retéléchargée, les autres restent en cache
hashes = {f: md5(f) for f in files if f.startswith('assets/')}
# Musiques : pas préchargées, mais rangées sous leur empreinte elles aussi (une musique changée est retéléchargée)
mdir = os.path.join(ROOT, 'assets/audio')
music = {'assets/audio/' + f: md5('assets/audio/' + f) for f in sorted(os.listdir(mdir)) if f.endswith('.mp3')} if os.path.isdir(mdir) else {}
sw = """// Last Loop : service worker (généré à chaque mise en ligne, version %(ver)s).
// Pages, code et styles : réseau d'abord (les mises à jour arrivent tout de suite) ; copie gardée si hors ligne,
// ou si la page n'arrive pas en 4 s (le code et les styles suivent alors la copie gardée).
// Images : cache d'abord, rangées sous leur empreinte (une image changée est retéléchargée à la mise à jour).
// Musiques : gardées en cache à la première écoute, sous leur empreinte ; le lecteur reçoit le morceau demandé.
const VERSION = '%(ver)s';
const CODE = 'lastloop-code-' + VERSION;
const MEDIA = 'lastloop-media';
const FILES = %(files)s;
const HASH = %(hashes)s;
const MUSIC = %(music)s;
const keyOf = f => f + '?h=' + (HASH[f] || MUSIC[f]);
const SLOW = 4000;  // ms
let slowUntil = 0;  // page servie par la copie gardée : code et styles en viennent aussi pendant 30 s (même version)
const loading = new Map();  // musiques en cours de téléchargement : un seul à la fois par fichier

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const code = await caches.open(CODE), media = await caches.open(MEDIA);
    // revalidés auprès du serveur (no-cache) : jamais une vieille copie dans le cache hors ligne, et rien n'est
    // retéléchargé de ce que le jeu vient de charger ; images : seulement celles dont l'empreinte a changé
    await Promise.all(FILES.map(async f => {
      try {
        if (!HASH[f]) return await code.add(new Request(f, { cache: 'no-cache' }));
        if (await media.match(keyOf(f))) return;
        const r = await fetch(f, { cache: 'no-cache' });
        if (r.ok) await media.put(keyOf(f), r);
      } catch (err) { /* réessayé à la demande */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if ((k.startsWith('lastloop-code-') && k !== CODE)) await caches.delete(k);
    // images et musiques d'anciennes versions (empreinte périmée, ou rangées sans empreinte) : retirées
    const media = await caches.open(MEDIA), base = new URL(self.registration.scope).pathname;
    const keep = new Set([...Object.keys(HASH), ...Object.keys(MUSIC)].map(keyOf));
    for (const req of await media.keys()) {
      const u = new URL(req.url), rel = u.pathname.slice(base.length) + u.search;
      if (!keep.has(rel)) await media.delete(req);
    }
    await self.clients.claim();
  })());
});

// Le morceau demandé (en-tête Range) d'une musique gardée en entier : Safari refuse le fichier entier
async function rangeFrom(req, res) {
  const m = /^bytes=(\\d*)-(\\d*)$/.exec(req.headers.get('range') || '');
  if (!m || (m[1] === '' && m[2] === '')) return res;
  const blob = await res.blob(), n = blob.size;
  const s = m[1] === '' ? Math.max(0, n - Number(m[2])) : Number(m[1]);
  const end = m[1] !== '' && m[2] !== '' ? Math.min(n - 1, Number(m[2])) : n - 1;
  if (s >= n || end < s) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + n } });
  return new Response(blob.slice(s, end + 1), { status: 206, headers: {
    'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg', 'Content-Range': 'bytes ' + s + '-' + end + '/' + n,
    'Content-Length': String(end - s + 1), 'Accept-Ranges': 'bytes' } });
}

// Téléchargement du fichier entier, une seule fois même si les deux lecteurs de la piste le demandent ensemble ;
// la réponse sert dès son arrivée, la copie dans le cache se fait en parallèle
function loadMusic(e, media, rel, url) {
  if (!loading.has(rel)) {
    const net = fetch(url, { cache: 'no-cache' });
    loading.set(rel, net);
    e.waitUntil(net.then(r => { if (r.ok && r.status === 200) return media.put(keyOf(rel), r.clone()); })
      .catch(() => {}).finally(() => loading.delete(rel)));
  }
  return loading.get(rel);
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const path = url.pathname, base = new URL(self.registration.scope).pathname;
  const rel = path.slice(base.length);
  if (/version\\.json$/.test(path)) return;     // vérification de mise à jour : toujours le réseau
  if (MUSIC[rel]) {
    e.respondWith((async () => {
      const media = await caches.open(MEDIA);
      const hit = await media.match(keyOf(rel));
      if (hit) return rangeFrom(req, hit);
      const range = req.headers.get('range');
      // début du fichier (ou sans Range) : le téléchargement complet sert tout de suite et reste gardé
      const full = loadMusic(e, media, rel, url.pathname);
      if (!range || /^bytes=0-$/.test(range)) {
        try { const r = await full; if (r.ok) return r.clone(); } catch (err) { /* réseau */ }
      }
      return fetch(req);
    })());
    return;
  }
  if (/\\/assets\\//.test(path)) {
    e.respondWith((async () => {
      const media = await caches.open(MEDIA);
      if (!HASH[rel]) return fetch(req);
      const hit = await media.match(keyOf(rel));
      if (hit) return hit;
      const r = await fetch(req, { cache: 'reload' });
      if (r.ok) media.put(keyOf(rel), r.clone());
      return r;
    })());
    return;
  }
  // la page du site (« ./ ») est rangée sous « index.html »
  const page = path === base || rel === 'index.html', key = path === base ? 'index.html' : req;
  // page venue de la copie gardée : le code et les styles aussi, sans attendre le réseau (sinon deux versions mélangées)
  if (!page && Date.now() < slowUntil) {
    e.respondWith(caches.open(CODE).then(c => c.match(key, { ignoreSearch: true })).then(hit => hit || fetch(req)));
    return;
  }
  // revalidé à chaque ouverture (le cache HTTP de GitHub Pages ne fait pas attendre une mise à jour) ;
  // la copie est faite avant que la page lise la réponse, et finie même si la copie gardée a déjà répondu
  const net = fetch(req, { cache: 'no-cache' });
  e.waitUntil(net.then(async r => {
    if (!r.ok || r.type !== 'basic') return;
    const copy = r.clone();
    await (await caches.open(CODE)).put(key, copy);
  }).catch(() => {}));
  e.respondWith((async () => {
    const code = await caches.open(CODE);
    const hit = await code.match(key, { ignoreSearch: true }) || (req.mode === 'navigate' ? await code.match('index.html') : null);
    if (!hit) return net.catch(() => Response.error());
    if (!page) return net.then(r => (r.ok ? r : hit), () => hit);
    // la page : copie gardée si le réseau manque, répond par une erreur, ou traîne plus de SLOW ms
    let done = false, timer = 0;
    const settle = fresh => { done = true; clearTimeout(timer); slowUntil = fresh ? 0 : Date.now() + 30000; };
    return Promise.race([
      net.then(r => { settle(r.ok); return r.ok ? r : hit; }, () => { settle(false); return hit; }),
      new Promise(res => { timer = setTimeout(() => { if (!done) { settle(false); res(hit); } }, SLOW); })
    ]);
  })());
});
""" % {'ver': ver, 'files': json.dumps(files, indent=0).replace('\n', ' '), 'hashes': json.dumps(hashes, separators=(',', ':')),
       'music': json.dumps(music, separators=(',', ':'))}
open(ROOT + '/sw.js', 'w').write(sw)
print('sw.js', ver, len(files), 'fichiers')
