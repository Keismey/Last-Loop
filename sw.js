// Last Loop : service worker (généré à chaque mise en ligne, version 0.24.4).
// Pages, code et styles : réseau d'abord (les mises à jour arrivent tout de suite), cache si hors ligne.
// Images : cache d'abord, rafraîchies en fond. Musiques : gardées en cache à la première écoute.
const VERSION = '0.24.4';
const CODE = 'lastloop-code-' + VERSION;
const MEDIA = 'lastloop-media';
const FILES = [ "./", "index.html", "manifest.webmanifest", "css/style.css", "js/main.js", "js/ui/abilities.js", "js/ui/balancePanel.js", "js/ui/campPanel.js", "js/ui/crewbar.js", "js/ui/debug.js", "js/ui/dragState.js", "js/ui/dragdrop.js", "js/ui/eventCard.js", "js/ui/gearUI.js", "js/ui/hud.js", "js/ui/icons.js", "js/ui/logPanel.js", "js/ui/mapPanel.js", "js/ui/menu.js", "js/ui/modal.js", "js/ui/panels.js", "js/ui/researchPanel.js", "js/ui/sceneInput.js", "js/ui/sheets.js", "js/ui/stationPanel.js", "js/ui/subtabs.js", "js/ui/summary.js", "js/ui/switchboard.js", "js/ui/toasts.js", "js/ui/trainPanel.js", "js/ui/tutorial.js", "js/ui/zoneUI.js", "js/audio/music.js", "js/audio/sound.js", "js/audio/wire.js", "js/sim/build.js", "js/sim/caboose.js", "js/sim/camp.js", "js/sim/combat.js", "js/sim/crew.js", "js/sim/defense.js", "js/sim/depot.js", "js/sim/energy.js", "js/sim/equipment.js", "js/sim/events.js", "js/sim/incursion.js", "js/sim/log.js", "js/sim/objectives.js", "js/sim/repair.js", "js/sim/research.js", "js/sim/route.js", "js/sim/simulate.js", "js/sim/station.js", "js/sim/world.js", "js/sim/zones.js", "js/render/assets.js", "js/render/camera.js", "js/render/crewLayer.js", "js/render/crewSprites.js", "js/render/enemies.js", "js/render/floaters.js", "js/render/landscape.js", "js/render/minimap.js", "js/render/mip.js", "js/render/parallax.js", "js/render/puppets.js", "js/render/scene.js", "js/render/sites.js", "js/render/train.js", "js/data/assets.js", "js/data/backgrounds.js", "js/data/balance.js", "js/data/build.js", "js/data/circuits.js", "js/data/config.js", "js/data/crewSprites.js", "js/data/enemies.js", "js/data/enemySprites.js", "js/data/events.js", "js/data/items.js", "js/data/landscape.js", "js/data/names.js", "js/data/objectives.js", "js/data/patchnotes.fr.js", "js/data/research.js", "js/data/sites.js", "js/data/sprites.js", "js/data/stations.js", "js/data/texts.fr.js", "js/data/wagons.js", "js/data/zones.js", "js/core/bus.js", "js/core/i18n.js", "js/core/loop.js", "js/core/rng.js", "js/core/save.js", "js/core/settings.js", "js/core/state.js", "assets/img/autoturret_head_0.webp", "assets/img/autoturret_head_1.webp", "assets/img/autoturret_head_2.webp", "assets/img/bg_c1_far.webp", "assets/img/bg_c1_mid.webp", "assets/img/bg_c1_near.webp", "assets/img/bogie.webp", "assets/img/camp_nomads_0.webp", "assets/img/camp_nomads_1.webp", "assets/img/camp_outpost_0.webp", "assets/img/camp_outpost_1.webp", "assets/img/camp_raiders_0.webp", "assets/img/camp_raiders_1.webp", "assets/img/camp_village_0.webp", "assets/img/camp_village_1.webp", "assets/img/coupler.webp", "assets/img/crew_cultiv_f.webp", "assets/img/crew_cultiv_f_m.webp", "assets/img/crew_cultiv_h.webp", "assets/img/crew_cultiv_h_m.webp", "assets/img/crew_guet_f.webp", "assets/img/crew_guet_f_m.webp", "assets/img/crew_guet_h.webp", "assets/img/crew_guet_h_m.webp", "assets/img/crew_mecano_f.webp", "assets/img/crew_mecano_f_m.webp", "assets/img/crew_mecano_h.webp", "assets/img/crew_mecano_h_m.webp", "assets/img/crew_savant_f.webp", "assets/img/crew_savant_f_m.webp", "assets/img/crew_savant_h.webp", "assets/img/crew_savant_h_m.webp", "assets/img/deco_barn.webp", "assets/img/deco_car.webp", "assets/img/deco_fence.webp", "assets/img/deco_house.webp", "assets/img/deco_pylon.webp", "assets/img/deco_rocks.webp", "assets/img/deco_tower.webp", "assets/img/deco_tractor.webp", "assets/img/deco_tree.webp", "assets/img/deco_windpump.webp", "assets/img/en_biker.webp", "assets/img/en_boss_c1.webp", "assets/img/en_brute.webp", "assets/img/en_militia.webp", "assets/img/en_runner.webp", "assets/img/enemy_drone.webp", "assets/img/ev_convoy.webp", "assets/img/ev_epidemic.webp", "assets/img/ev_map.webp", "assets/img/ev_mechanic.webp", "assets/img/ev_merchant.webp", "assets/img/ev_overheat.webp", "assets/img/ev_rail.webp", "assets/img/ev_storm.webp", "assets/img/ev_survivor.webp", "assets/img/ev_warehouse.webp", "assets/img/flag.webp", "assets/img/gus_0.webp", "assets/img/gus_1.webp", "assets/img/gus_2.webp", "assets/img/ico_ammo.webp", "assets/img/ico_auto.webp", "assets/img/ico_barrage.webp", "assets/img/ico_bolt.webp", "assets/img/ico_clock.webp", "assets/img/ico_com.webp", "assets/img/ico_crew.webp", "assets/img/ico_food.webp", "assets/img/ico_fuel.webp", "assets/img/ico_heart.webp", "assets/img/ico_keys.webp", "assets/img/ico_know.webp", "assets/img/ico_lock.webp", "assets/img/ico_log.webp", "assets/img/ico_map.webp", "assets/img/ico_mec.webp", "assets/img/ico_parts.webp", "assets/img/ico_question.webp", "assets/img/ico_research.webp", "assets/img/ico_sav.webp", "assets/img/ico_scrap.webp", "assets/img/ico_shield.webp", "assets/img/ico_site_camp.webp", "assets/img/ico_site_depot.webp", "assets/img/ico_site_field.webp", "assets/img/ico_site_forest.webp", "assets/img/ico_site_fortress.webp", "assets/img/ico_site_junkyard.webp", "assets/img/ico_site_mine.webp", "assets/img/ico_site_ruins.webp", "assets/img/ico_site_station.webp", "assets/img/ico_skull.webp", "assets/img/ico_smile.webp", "assets/img/ico_star.webp", "assets/img/ico_steam.webp", "assets/img/ico_target.webp", "assets/img/ico_ter.webp", "assets/img/ico_trade.webp", "assets/img/ico_train.webp", "assets/img/ico_wrench.webp", "assets/img/ico_zoom.webp", "assets/img/loco_t1.webp", "assets/img/loco_t2.webp", "assets/img/roof_attic.webp", "assets/img/roof_autoturret.webp", "assets/img/roof_berths.webp", "assets/img/signal_0.webp", "assets/img/signal_1.webp", "assets/img/signal_2.webp", "assets/img/site_convoy.webp", "assets/img/site_depot.webp", "assets/img/site_field.webp", "assets/img/site_field_low.webp", "assets/img/site_forest.webp", "assets/img/site_forest_low.webp", "assets/img/site_fortress.webp", "assets/img/site_junkyard.webp", "assets/img/site_junkyard_low.webp", "assets/img/site_mine.webp", "assets/img/site_mine_low.webp", "assets/img/site_refinery.webp", "assets/img/site_ruins.webp", "assets/img/site_station.webp", "assets/img/site_traverse.webp", "assets/img/studio_logo.webp", "assets/img/title_keyart.webp", "assets/img/turret_head_0.webp", "assets/img/turret_head_1.webp", "assets/img/turret_head_2.webp", "assets/img/wagon_boiler.webp", "assets/img/wagon_bunk.webp", "assets/img/wagon_caboose.webp", "assets/img/wagon_caboose_breached.webp", "assets/img/wagon_cargo.webp", "assets/img/wagon_foundry.webp", "assets/img/wagon_gatherer.webp", "assets/img/wagon_greenhouse.webp", "assets/img/wagon_lab.webp", "assets/img/wagon_turret.webp", "assets/img/wagon_turret_bare.webp", "assets/img/wagon_workshop.webp", "assets/img/wheel_driver.webp", "assets/img/wheel_wagon.webp", "assets/icons/icon-180.png", "assets/icons/icon-192.png", "assets/icons/icon-512.png", "assets/icons/icon-64.png", "assets/icons/maskable-512.png" ];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const code = await caches.open(CODE), media = await caches.open(MEDIA);
    // relus sans le cache HTTP du navigateur : jamais une vieille copie dans le cache hors ligne
    await Promise.all(FILES.map(f => (/^assets\//.test(f) ? media : code).add(new Request(f, { cache: 'reload' })).catch(() => {})));
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
  if (/version\.json$/.test(path)) return;     // vérification de mise à jour : toujours le réseau
  // Musiques : le lecteur demande des morceaux (Range) ; on sert le fichier entier gardé en cache s'il existe
  if (/\.mp3$/.test(path)) {
    e.respondWith((async () => {
      const media = await caches.open(MEDIA);
      const hit = await media.match(path);
      if (hit && !req.headers.has('range')) return hit;
      if (!hit) fetch(path).then(r => { if (r.ok && r.status === 200) media.put(path, r); }).catch(() => {});
      try { return await fetch(req); } catch (err) { return hit || Response.error(); }
    })());
    return;
  }
  if (/\/assets\//.test(path)) {
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
      // revalidé à chaque ouverture (le cache HTTP de GitHub Pages ne fait pas attendre une mise à jour)
      const r = await fetch(req, { cache: 'no-cache' });
      if (r.ok) code.put(req, r.clone());
      return r;
    } catch (err) {
      return (await code.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' && await code.match('./')) || Response.error();
    }
  })());
});
