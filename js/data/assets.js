// Liste de tous les assets attendus (GDD §15.7 et §16.2).
// Chaque asset manquant est remplacé par un dessin provisoire : le jeu reste jouable sans aucune image.
// group 'boot' = chargé à l'ouverture ; les autres groupes seront chargés à la demande.

const IMG = 'assets/img/';
const list = [];
const add = (id, w, h, kind, group = 'later') => list.push({ id, src: IMG + id + '.webp', w, h, kind, group });

// Décors des 3 zones : 3 couches
for (let c = 1; c <= 3; c++) {
  const g = c === 1 ? 'boot' : 'later';
  add(`bg_c${c}_far`, 1600, 900, 'opaque', g);
  add(`bg_c${c}_mid`, 1600, 900, 'sprite', g);
  add(`bg_c${c}_near`, 1600, 900, 'sprite', g);
}
// Camps : état normal (0) et fortifié (1) ; drapeau animé (4 images, teinté selon l'attitude) ; signal d'aiguillage
['village', 'nomads', 'outpost', 'raiders'].forEach(c =>
  [0, 1].forEach(d => add(`camp_${c}_${d}`, 660, 330, 'sprite', 'boot')));
add('flag', 668, 413, 'sprite', 'boot');
[0, 1, 2].forEach(i => add(`signal_${i}`, 200, 480, 'sprite', 'boot'));
add('site_traverse', 1000, 499, 'sprite', 'boot');
// Extensions de toit, fourgon enfoncé, têtes de tourelle (profil, face, trois quarts)
['roof_attic', 'roof_berths', 'roof_autoturret'].forEach(r => add(r, 620, 117, 'sprite', 'boot'));
add('wagon_caboose_breached', 615, 403, 'sprite', 'boot');
[0, 1, 2].forEach(i => { add(`turret_head_${i}`, 268, 154, 'sprite', 'boot'); add(`autoturret_head_${i}`, 242, 170, 'sprite', 'boot'); });
add('wagon_turret_bare', 618, 336, 'sprite', 'boot');
// Locomotives et wagons
for (let t = 1; t <= 4; t++) add(`loco_t${t}`, 520, 264, 'sprite', t <= 2 ? 'boot' : 'later');
['boiler', 'greenhouse', 'bunk', 'gatherer', 'turret', 'workshop', 'cargo', 'lab', 'foundry', 'caboose']
  .forEach(w => add(`wagon_${w}`, 440, 264, 'sprite', 'boot'));
// Ennemis et boss
['biker', 'runner', 'drone', 'brute', 'wolf', 'sandcrawler', 'wraith', 'militia']
  .forEach(e => add(`enemy_${e}`, 192, 192, 'sprite', 'boot'));
// Lieux à image propre (site.art)
add('site_convoy', 1000, 192, 'sprite', 'boot'); add('site_refinery', 760, 310, 'sprite', 'boot');
for (let c = 1; c <= 3; c++) add(`boss_c${c}`, 640, 360, 'sprite', c === 1 ? 'boot' : 'later');
// Planches animées (marche, attaque, coup reçu, chute ; le boss : roule, tir, charge, saut, épave)
['biker', 'runner', 'brute', 'militia', 'boss_c1'].forEach(e => add(`en_${e}`, 2048, 400, 'sprite', 'boot'));
// Événements
['survivor', 'convoy', 'merchant', 'storm', 'mechanic', 'rail', 'warehouse', 'epidemic', 'map', 'overheat']
  .forEach(e => add(`ev_${e}`, 960, 540, 'opaque'));
// Divers
add('title_keyart', 1920, 1080, 'opaque', 'boot');
add('ending', 960, 540, 'opaque');
[0, 1, 2].forEach(i => add(`gus_${i}`, 224, 384, 'sprite', 'boot'));      // parle, rit, s'inquiète
// Survivants (planches Gemini) : atlas et masque des couleurs repères, par base (rôle × sexe)
['mecano_f', 'mecano_h', 'cultiv_f', 'cultiv_h', 'guet_f', 'guet_h', 'savant_f', 'savant_h'].forEach(b => {
  add('crew_' + b, 1900, 190, 'sprite', 'boot'); add('crew_' + b + '_m', 1900, 190, 'sprite', 'boot');
});
// Pièces du train (roues, bogie, attelage), assemblées et animées par le code
add('wheel_driver', 160, 160, 'sprite', 'boot');
add('wheel_wagon', 96, 96, 'sprite', 'boot');
add('bogie', 360, 77, 'sprite', 'boot');
add('coupler', 160, 128, 'sprite', 'boot');
// Éléments de décor dispersés le long de la voie (Plaines de Cendre)
['deco_pylon', 'deco_barn', 'deco_tree', 'deco_fence', 'deco_windpump', 'deco_car', 'deco_house', 'deco_tractor',
  'deco_rocks', 'deco_tower'].forEach(d => add(d, 700, 700, 'sprite', 'boot'));
// Sites (planches Gemini A, B, C)
['field', 'forest', 'mine', 'junkyard'].forEach(s => { add('site_' + s, 900, 400, 'sprite', 'boot'); add('site_' + s + '_low', 900, 400, 'sprite', 'boot'); });
['ruins', 'station', 'depot', 'fortress'].forEach(s => add('site_' + s, 900, 400, 'sprite', 'boot'));

export const IMAGES = list;

// Assets réellement présents dans assets/ (mis à jour à chaque ajout d'images).
// Le jeu ne demande que ceux-là : aucune requête inutile pour les images pas encore produites.
export const AVAILABLE = new Set([
  'title_keyart', 'loco_t1', 'bg_c1_far', 'bg_c1_mid', 'bg_c1_near',
  'wheel_driver', 'wheel_wagon', 'bogie', 'coupler',
  'deco_pylon', 'deco_barn', 'deco_tree', 'deco_fence', 'deco_windpump', 'deco_car', 'deco_house', 'deco_tractor',
  'deco_rocks', 'deco_tower',
  'site_field', 'site_field_low', 'site_forest', 'site_forest_low', 'site_mine', 'site_mine_low',
  'site_junkyard', 'site_junkyard_low', 'site_ruins', 'site_station', 'site_depot', 'site_fortress',
  'wagon_boiler', 'wagon_greenhouse', 'wagon_bunk', 'wagon_gatherer', 'wagon_turret', 'wagon_workshop',
  'en_biker', 'en_runner', 'en_brute', 'en_militia', 'en_boss_c1',
  'loco_t2', 'wagon_cargo', 'wagon_lab', 'wagon_caboose',
  'ev_survivor', 'ev_convoy', 'ev_merchant', 'ev_storm', 'ev_mechanic', 'ev_rail', 'ev_warehouse', 'ev_epidemic', 'ev_map', 'ev_overheat',
  'crew_mecano_f', 'crew_mecano_f_m', 'crew_mecano_h', 'crew_mecano_h_m', 'crew_cultiv_f', 'crew_cultiv_f_m',
  'crew_cultiv_h', 'crew_cultiv_h_m', 'crew_guet_f', 'crew_guet_f_m', 'crew_guet_h', 'crew_guet_h_m',
  'crew_savant_f', 'crew_savant_f_m', 'crew_savant_h', 'crew_savant_h_m',
  'camp_village_0', 'camp_village_1', 'camp_nomads_0', 'camp_nomads_1', 'camp_outpost_0', 'camp_outpost_1',
  'camp_raiders_0', 'camp_raiders_1', 'flag', 'signal_0', 'signal_1', 'signal_2', 'site_traverse', 'site_convoy', 'site_refinery',
  'roof_attic', 'roof_berths', 'roof_autoturret', 'wagon_caboose_breached', 'wagon_foundry',
  'turret_head_0', 'turret_head_1', 'turret_head_2', 'autoturret_head_0', 'autoturret_head_1', 'autoturret_head_2',
  'wagon_turret_bare', 'enemy_drone', 'gus_0', 'gus_1', 'gus_2',
  // Icônes (3 planches Gemini, 128 px)
  'ico_ammo', 'ico_auto', 'ico_barrage', 'ico_bolt', 'ico_clock', 'ico_com', 'ico_crew', 'ico_food', 'ico_fuel', 'ico_heart', 'ico_keys', 'ico_know', 'ico_lock', 'ico_log', 'ico_map', 'ico_mec', 'ico_parts', 'ico_question', 'ico_research', 'ico_sav', 'ico_scrap', 'ico_shield', 'ico_site_camp', 'ico_site_depot', 'ico_site_field', 'ico_site_forest', 'ico_site_fortress', 'ico_site_junkyard', 'ico_site_mine', 'ico_site_ruins', 'ico_site_station', 'ico_skull', 'ico_smile', 'ico_star', 'ico_steam', 'ico_target', 'ico_ter', 'ico_trade', 'ico_train', 'ico_wrench', 'ico_zoom'
]);

// Musiques (Gemini) : boucles MP3. Seules celles de AVAILABLE_MUSIC sont demandées au serveur.
export const MUSIC = ['mus_title', 'mus_c1', 'mus_c2', 'mus_c3', 'mus_combat', 'mus_boss', 'mus_station']
  .map(id => ({ id, src: `assets/audio/${id}.mp3` }));
export const AVAILABLE_MUSIC = new Set(['mus_title', 'mus_c1', 'mus_combat', 'mus_station']);
