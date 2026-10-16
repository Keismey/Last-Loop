// Combat (GDD §6) : vagues et budget de menace, ennemis, tourelles et ciblage, intégrité,
// Pleine vapeur, assaut de forteresse et boss. Tout l'état vit dans state.combat (sérialisable).
import { ENEMIES, BOSSES, BIOME_POOLS, CAMP_POOLS, COMBAT, ringFactor } from '../data/enemies.js';
import { CAMP_TYPES, ROUTE } from '../data/sites.js';
import { WAGONS } from '../data/wagons.js';
import { BALANCE, PROGRESS } from '../data/balance.js';
import { BUILD } from '../data/build.js';
import { getCircuit, findSite } from '../data/circuits.js';
import { workers, moraleShock } from './crew.js';
import { capacities } from '../core/state.js';
import { rngNext } from '../core/rng.js';
import { bus } from '../core/bus.js';
import { upcomingSite, trainSpeed, leaveStop, derailToDepot, addGain } from './route.js';
import { crewPositions, absorb, updateDefenders, defendersAt } from './defense.js';
import { rollLoot, bossLoot } from './equipment.js';
import { entryWagon, isAssault, updateIncursions } from './incursion.js';
import { caboose, hitCaboose, regenCaboose } from './caboose.js';
import { attitudeOf, payTribute, raidVictory } from './camp.js';
import { CAMP } from '../data/sites.js';
import { huntMult, huntLevel, onBossDefeated, easeHunt, resetHunt } from './zones.js';
import { fx } from './research.js';

// Menace : facteur de l'anneau × traque (tant que le boss de la zone vit, elle monte à chaque tour)
const threat = state => ringFactor(state.route.ring) * huntMult(state);

// ---------- État ----------
export function newCombat() {
  return {
    enemies: [], queue: [], nextId: 1, target: null,
    waves: {}, nextWave: 1,
    wander: null,          // errants prévus sur ce transit : { at: distance }
    campDone: null,        // dernier camp qui a déjà réagi au passage du train
    assault: null,         // assaut de forteresse en cours
    raid: null,            // pillage d'un camp en cours
    steam: { left: 0, cd: 0 },      // Pleine vapeur
    barrage: { left: 0, cd: 0 },    // Salve de barrage (locomotive T2)
    lowWarned: false
  };
}

export function ensureCombat(state) {
  if (!state.combat) state.combat = newCombat();
  const c = state.combat;
  if (!c.steam) c.steam = { left: 0, cd: 0 };
  if (!c.barrage) c.barrage = { left: 0, cd: 0 };
  if (!c.waves) c.waves = {};
  if (!c.queue) c.queue = [];
  if (typeof state.train.integrity !== 'number') state.train.integrity = maxIntegrity(state);
}

// Intégrité max = blindage de la locomotive + 10 × somme des niveaux des wagons (GDD §4.5)
export function maxIntegrity(state) {
  const levels = state.train.wagons.reduce((a, w) => a + w.level, 0);
  const base = (BUILD.locos[state.train.loco] || BUILD.locos[1]).armor + COMBAT.integrityPerLevel * levels;
  return Math.round(base * (1 + fx(state, 'integrity')));   // Blindage composite (recherche)
}

export function steamActive(state) {
  return !!(state.combat && state.combat.steam && state.combat.steam.left > 0);
}

export const statsOf = e => (e.boss ? BOSSES[e.type] : ENEMIES[e.type]);
// La traque durcit aussi chaque ennemi (PV, et dégâts à moitié), pas seulement leur nombre
const difficulty = state => getCircuit(state.route.ring).enemyMult * BALANCE.enemyMult * (1 + PROGRESS.huntToughness * huntLevel(state));
const alive = e => e.phase === 'approach' || e.phase === 'attached';

export function activeEnemies(state) {
  return state.combat ? state.combat.enemies.filter(alive) : [];
}

export function inCombat(state) {
  const c = state.combat;
  return !!c && (c.queue.length > 0 || c.enemies.some(alive));
}

// ---------- Composition des vagues ----------
function weightedPick(state, entries) {
  const total = entries.reduce((a, [, w]) => a + w, 0);
  let r = rngNext(state) * total;
  for (const [id, w] of entries) { r -= w; if (r <= 0) return id; }
  return entries[entries.length - 1][0];
}

function composeWave(state, pool, budget, noBrute) {
  const list = [];
  let left = budget;
  const usable = Object.entries(pool).filter(([id]) => ENEMIES[id] && !(noBrute && id === 'brute')
    && !(ENEMIES[id].minBudget && budget < ENEMIES[id].minBudget));
  for (let guard = 0; guard < 40 && left > 0.3; guard++) {
    const fit = usable.filter(([id]) => ENEMIES[id].threat <= left + 0.3);
    if (!fit.length) break;
    const id = weightedPick(state, fit);
    list.push(id);
    left -= ENEMIES[id].threat;
  }
  if (!list.length && usable.length) {
    list.push(usable.reduce((a, b) => (ENEMIES[a[0]].threat <= ENEMIES[b[0]].threat ? a : b))[0]);
  }
  return list;
}

function newWave(state, kind, extra = {}) {
  const c = state.combat;
  const id = c.nextWave++;
  c.waves[id] = { kind, total: 0, alive: 0, killed: 0, loot: {}, ...extra };
  return id;
}

function queueEnemies(state, waveId, types, delay = 0) {
  const c = state.combat;
  const [g0, g1] = COMBAT.spawnGap;
  let d = delay;
  for (const type of types) {
    c.queue.push({ type, wave: waveId, delay: d });
    d += g0 + (g1 - g0) * rngNext(state);
    c.waves[waveId].total += 1;
    c.waves[waveId].alive += 1;
  }
}

function launchWave(state, kind, pool, budget, opts = {}) {
  const types = composeWave(state, pool, budget, opts.noBrute);
  if (!types.length) return null;
  const id = newWave(state, kind);
  queueEnemies(state, id, types, opts.delay || 0);
  if (!opts.silent) bus.emit('combat:wave', { kind, n: types.length, site: opts.site || null });
  return id;
}

// ---------- Apparition ----------
function spawn(state, q) {
  const c = state.combat;
  const D = difficulty(state);
  const boss = !!BOSSES[q.type];
  const E = boss ? BOSSES[q.type] : ENEMIES[q.type];
  const hp = boss ? E.hp : E.hp * D;
  const wave = c.waves[q.wave];
  const assault = boss || !wave || isAssault(wave.kind);
  const e = {
    id: c.nextId++, type: q.type, wave: q.wave, boss,
    hp, max: hp, dps: E.dps * (boss ? 1 : 1 + 0.5 * (D - 1)),
    // Assaut : par l'arrière, sur le dernier wagon ; errants : tous sur le même wagon, au hasard
    mode: assault ? 'assault' : 'infest',
    wagon: entryWagon(state, wave, E),
    side: assault || rngNext(state) < COMBAT.rearChance ? -1 : 1,
    lane: rngNext(state) - 0.5,
    phase: 'approach', t: 0, arrive: E.arrive,
    steamT: 0, hitT: -9, hitBy: -1, summoned: 0
  };
  c.enemies.push(e);
  if (boss) bus.emit('combat:bossArrives', e);
  return e;
}

// ---------- Errants et camps ----------
// Au début de chaque transit : 10 % de chance que des errants surgissent quelque part sur le trajet
export function onTransit(state) {
  if (!state.combat) return;
  const c = state.combat;
  c.wander = null;
  if (state.route.lap <= 1) return;          // premier tour : pas d'errants, le temps de s'installer
  if (rngNext(state) < COMBAT.wanderChance * huntMult(state)) {     // la traque rend les errants plus fréquents
    c.wander = { at: state.route.distance + ROUTE.transit * (0.15 + 0.45 * rngNext(state)) };
  }
}

// Force d'un camp (GDD §3.5) : base × (1 + 0,25 × défense) × facteur de ressources × facteur d'anneau
export function campForce(state, site) {
  const st = state.world.sites[site.id] || {};
  const base = CAMP_TYPES[site.camp].strength;
  let res = 1;
  if (site.links && site.links.length) {
    const stocks = site.links.map(id => (state.world.sites[id] ? state.world.sites[id].stock : 1));
    res = 0.5 + 0.5 * (stocks.reduce((a, b) => a + b, 0) / stocks.length);
  }
  return base * (1 + 0.25 * (st.defense || 0)) * res * threat(state);
}

function campPool(state, site) {
  return site.camp === 'raiders' ? BIOME_POOLS[state.route.ring] : CAMP_POOLS[site.camp];
}

function campReacts(state, site) {
  const st = state.world.sites[site.id] || {};
  const att = attitudeOf(state, site);
  const plan = state.route.plan[site.id];
  if (plan === 'raid') return;                 // le pillage se joue à l'arrêt
  // Tribut : un camp hostile payé laisse passer le train
  if (att === 'hostile' && plan === 'tribute') {
    const cost = payTribute(state);
    if (cost) { bus.emit('camp:tribute', { site, cost }); return; }
    bus.emit('camp:noTribute', site);
  }
  const force = campForce(state, site);
  const pool = campPool(state, site);
  const noBrute = site.camp === 'village' && (st.defense || 0) < 3;
  if (att === 'hostile') {
    if (force < COMBAT.twoWavesFrom) launchWave(state, 'camp', pool, force, { site: site.name, noBrute });
    else {
      launchWave(state, 'camp', pool, force * 0.6, { site: site.name, noBrute });
      launchWave(state, 'camp', pool, force * 0.6, { delay: COMBAT.secondWaveSec, silent: true, noBrute });
    }
  } else if (att === 'suspicious' && state.route.lap > 1 && rngNext(state) < COMBAT.warnChance) {
    launchWave(state, 'warning', pool, force / 2, { site: site.name, noBrute });
  }
}

// ---------- Fin d'embranchement : tout le monde décroche, sans butin (GDD §6.7) ----------
export function onJunction(state, everyone = false) {
  const c = state.combat;
  if (!c) return;
  for (const e of c.enemies) if (alive(e) && (everyone || !e.boss)) detach(state, e);
  const keep = [];
  for (const q of c.queue) {
    if (!everyone && BOSSES[q.type]) { keep.push(q); continue; }
    const w = c.waves[q.wave];
    if (w) { w.alive -= 1; w.fled = true; }
  }
  c.queue = keep;
  c.wander = null;
  c.target = null;
  if (everyone) { c.assault = null; c.raid = null; }
  for (const [id, w] of Object.entries(c.waves)) if (w.alive <= 0) delete c.waves[id];
}

function detach(state, e) {
  if (!alive(e)) return;
  e.phase = 'leave';
  e.t = 0;
  const w = state.combat.waves[e.wave];
  if (w) { w.alive -= 1; w.fled = true; }
  if (state.combat.target === e.id) state.combat.target = null;
}

// ---------- Dégâts, mort, butin ----------
function grant(state, loot, mult) {
  const caps = capacities(state);
  const got = {};
  for (const [res, v] of Object.entries(loot)) {
    const before = state.resources[res] || 0;
    state.resources[res] = Math.min(caps[res] ?? Infinity, before + v * mult);
    const real = state.resources[res] - before;
    if (real > 0) { got[res] = real; addGain(state, res, real); }
  }
  return got;
}

function kill(state, e) {
  const c = state.combat;
  if (e.phase === 'approach') e.diedAt = e.t / e.arrive;     // tombé en route : le corps reste où il était
  e.phase = 'dead';
  e.t = 0;
  if (c.target === e.id) c.target = null;
  const S = statsOf(e);
  let got = {};
  if (!e.boss && S.loot && !(S.lootChance && rngNext(state) > S.lootChance)) {
    got = grant(state, S.loot, getCircuit(state.route.ring).lootMult * BALANCE.incomeMult);
  }
  const w = c.waves[e.wave];
  if (w) {
    w.alive -= 1;
    w.killed += 1;
    for (const [r, v] of Object.entries(got)) w.loot[r] = (w.loot[r] || 0) + v;
  }
  if (state.route.lapStats) state.route.lapStats.kills += 1;
  state.stats.kills = (state.stats.kills || 0) + 1;
  // Équipement : parfois un objet (toujours pour un boss)
  if (e.boss) bossLoot(state, e.type); else rollLoot(state, e.type);
  if (e.boss && c.assault) c.assault.bossDead = true;
  bus.emit('combat:kill', { e, got });
}

export function hurt(state, e, dmg, from, crewId = null) {
  e.hp -= dmg;
  e.hitT = state.time;
  e.hitBy = from;
  e.hitCrew = crewId;
  if (e.hp <= 0) kill(state, e);
}

// Une cible est à portée d'une tourelle accrochée au wagon i
const targetable = e => e.phase === 'attached' || (e.phase === 'approach' && e.t >= e.arrive * COMBAT.inRangeFrom);
export const inTurretRange = (e, i, state) => targetable(e) && Math.abs(e.wagon - i) <= COMBAT.turretRange + (state ? fx(state, 'range') : 0);
// Armure ennemie, percée par les munitions perforantes (recherche)
export const enemyArmor = (state, e) => statsOf(e).armor * (1 - fx(state, 'pierce'));

// Puissance de feu d'une tourelle (GDD §6.4) : renvoie { dps, ammo } (0 si personne au poste)
export function turretFire(state, w) {
  const def = WAGONS[w.type];
  // Tourelle auto sur le toit : puissance fixe, suit le courant (aucun équipage)
  if (w.roofTurret && !w.broken) {
    const f = state.power ? state.power.factor : 1;
    return { dps: BUILD.roofTurret.dps * f, ammo: COMBAT.ammoPerEff };
  }
  if (!def || !def.produce || !def.produce.dps || w.broken) return { dps: 0, ammo: 0 };
  if (!def.skill) {
    const f = state.power ? state.power.factor : 1;
    return { dps: def.produce.dps * f, ammo: COMBAT.ammoPerEff };
  }
  const sumEff = workers(state, w).reduce((a, x) => a + x.eff, 0);
  return {
    dps: sumEff * COMBAT.dpsPerEff * (1 + COMBAT.turretLevelBonus * (w.level - 1)),
    ammo: sumEff * COMBAT.ammoPerEff
  };
}

function updateTurrets(state, dt) {
  const c = state.combat;
  const res = state.resources;
  state.train.wagons.forEach((w, i) => {
    const fire = turretFire(state, w);
    if (!fire.dps) { delete w.aim; return; }
    const cands = c.enemies.filter(e => inTurretRange(e, i, state));
    if (!cands.length) { delete w.aim; return; }
    const tgt = cands.find(e => e.id === c.target) || cands.reduce((a, b) => (b.hp < a.hp ? b : a));
    // La tête de tourelle se tourne vers sa cible : −2 loin derrière (à gauche) … +2 loin devant
    w.aim = tgt.phase === 'approach' ? (tgt.side < 0 ? -2 : 2) : Math.max(-2, Math.min(2, i - tgt.wagon));
    const B = c.barrage && c.barrage.left > 0 ? COMBAT.abilities.barrage : null;   // Salve de barrage
    const loaded = res.ammo > 0;
    if (loaded) res.ammo = Math.max(0, res.ammo - fire.ammo * (B ? B.ammo : 1) * dt);
    const dmg = fire.dps * (B ? B.dmg : 1) * (loaded ? 1 : COMBAT.noAmmoFactor) * (1 - enemyArmor(state, tgt)) * (1 + fx(state, 'damage') + fx(state, 'turretDamage')) * dt;
    hurt(state, tgt, dmg, i);
    bus.emit('combat:fire', 'turret');
  });
}

// ---------- Ennemis ----------
function updateEnemies(state, dt, pos) {
  const c = state.combat;
  const F = COMBAT.abilities.fullsteam;
  const steam = steamActive(state);
  const wagons = state.train.wagons;
  for (const w of wagons) w.attacked = false;
  const cb = caboose(state);
  if (cb) cb.attacked = false;
  const last = cb ? wagons.length : wagons.length - 1;     // le fourgon de queue est la position n
  let dmgTotal = 0;
  for (const e of c.enemies) {
    if (e.phase === 'dead' || e.phase === 'leave') { e.t += dt; continue; }
    if (e.wagon > last) e.wagon = last;
    // Pleine vapeur : les ennemis terrestres (hors boss) finissent par décrocher
    if (steam && !e.boss && !statsOf(e).fly) {
      e.steamT += dt;
      if (e.steamT >= F.detachSec) { detach(state, e); continue; }
    }
    if (e.phase === 'approach') {
      e.t += dt;
      if (e.t >= e.arrive) { e.phase = 'attached'; e.t = 0; }
      continue;
    }
    e.t += dt;
    // Boss : bélier contre le fourgon, puis hors des rails
    if (e.boss && BOSSES[e.type].ram) { dmgTotal += bossTick(state, e, pos, dt); bossSummon(state, e); continue; }
    const w = wagons[e.wagon] || cb;
    w.attacked = true;
    // Les défenseurs du wagon encaissent une partie des coups (moins avec une armure)
    const rest = absorb(state, pos, e.wagon, e.dps * dt);
    // Au fourgon de queue : la porte prend les coups tant qu'elle tient
    dmgTotal += w === cb ? hitCaboose(state, rest) : rest;
    // Boss : renforts quand ses PV passent sous un seuil
    if (e.boss) {
      const sm = BOSSES[e.type].summon;
      if (sm && e.summoned < sm.at.length && e.hp / e.max < sm.at[e.summoned]) {
        e.summoned += 1;
        const w2 = c.waves[e.wave];
        if (w2) queueEnemies(state, e.wave, Array(sm.n).fill(sm.type), 0.3);
        bus.emit('combat:summon', e);
      }
    }
  }
  if (dmgTotal > 0) {
    state.train.integrity = Math.max(0, state.train.integrity - dmgTotal);
    bus.emit('combat:hit', dmgTotal);
  }
  c.enemies = c.enemies.filter(e => !((e.phase === 'dead' && e.t > 0.8) || (e.phase === 'leave' && e.t > 1.6)));
}

function updateQueue(state, dt) {
  const c = state.combat;
  let onScreen = c.enemies.filter(alive).length;
  for (const q of c.queue) q.delay -= dt;
  const keep = [];
  for (const q of c.queue) {
    if (q.delay <= 0 && (onScreen < COMBAT.maxOnScreen || BOSSES[q.type])) {
      spawn(state, q);
      onScreen += 1;
    } else keep.push(q);
  }
  c.queue = keep;
}

function updateWaves(state) {
  const c = state.combat;
  for (const [id, w] of Object.entries(c.waves)) {
    const pending = c.queue.some(q => q.wave === Number(id));
    if (w.alive > 0 || pending) continue;
    if (w.killed > 0 && !w.fled) {
      if (state.route.lapStats) state.route.lapStats.waves += 1;
      moraleShock(state, BALANCE.crew.moraleWave);
      bus.emit('combat:cleared', { kind: w.kind, loot: w.loot });
    }
    delete c.waves[id];
  }
}

// ---------- Boss en deux phases ----------
// bp : 'ram' (bélier contre le fourgon blindé) → 'jump' (il saute des rails) → 'move' / 'strike' (il longe le train)
function bossSummon(state, e) {
  const c = state.combat;
  const sm = BOSSES[e.type].summon;
  if (sm && e.summoned < sm.at.length && e.hp / e.max < sm.at[e.summoned]) {
    e.summoned += 1;
    if (c.waves[e.wave]) queueEnemies(state, e.wave, Array(sm.n).fill(sm.type), 0.3);
    bus.emit('combat:summon', e);
  }
}

function bossNextTarget(state, e) {
  const n = state.train.wagons.length;
  let j = Math.floor(rngNext(state) * n);
  if (n > 1 && j === e.wagon) j = (j + 1 + Math.floor(rngNext(state) * (n - 1))) % n;
  e.moveFrom = e.wagon;
  e.moveT = 0;
  e.wagon = j;
  e.bp = 'move';
  e.bt = 0;
}

function bossTick(state, e, pos, dt) {
  const B = BOSSES[e.type];
  const cb = caboose(state);
  const n = state.train.wagons.length;
  if (!e.bp) { e.bp = cb && !cb.breached ? 'ram' : 'jump'; e.bt = 0; if (e.bp === 'jump') bus.emit('combat:bossJump', e); }
  e.bt += dt;
  if (e.bp === 'ram') {
    e.wagon = n;
    if (!cb || cb.breached) { e.bp = 'jump'; e.bt = 0; e.warn = false; bus.emit('combat:bossJump', e); return 0; }
    cb.attacked = true;
    const R = B.ram;
    e.warn = e.bt < R.warn;
    if (!e.rammed && e.bt >= R.warn) {
      // Impact : les gardes du fourgon amortissent le choc (et le prennent en partie)
      e.rammed = true;
      const guards = defendersAt(state, pos, n);
      const cut = Math.min(R.guardCutMax, R.guardCut * guards.length);
      for (const s of guards) s.hp -= R.guardHit;
      const rest = hitCaboose(state, R.dmg * (1 - cut));
      bus.emit('combat:ram', { e, guards: guards.length });
      return rest;
    }
    if (e.bt >= R.warn + R.recover) { e.bt = 0; e.rammed = false; }
    return 0;
  }
  if (e.bp === 'jump') {
    e.warn = false;
    if (e.bt >= B.jumpSec) { e.wagon = Math.min(e.wagon, n - 1); bossNextTarget(state, e); }
    return 0;
  }
  if (e.bp === 'move') {
    if (e.bt >= B.moveSec) { e.bp = 'strike'; e.bt = 0; }
    return 0;
  }
  // Frappe le wagon qu'il longe
  const w = state.train.wagons[e.wagon];
  if (!w) { bossNextTarget(state, e); return 0; }
  w.attacked = true;
  const rest = absorb(state, pos, e.wagon, e.dps * B.strikeMult * dt);
  if (e.bt >= B.strikeSec) bossNextTarget(state, e);
  return rest;
}

// ---------- Pillage d'un camp (GDD §3.4) : combat à l'arrêt, ils attaquent par l'arrière ----------
export function startRaid(state, site) {
  const c = state.combat;
  const force = campForce(state, site) * CAMP.raidBudget;
  const id = launchWave(state, 'raid', campPool(state, site), force, { site: site.name });
  c.raid = { site: site.id, wave: id, t: 0, won: false, wonT: 0 };
}

export function fleeRaid(state) {
  const c = state.combat;
  if (!c || !c.raid || c.raid.won) return false;
  onJunction(state, true);
  bus.emit('combat:fled');
  if (state.route.mode === 'stop') leaveStop(state);
  return true;
}

function updateRaid(state, dt) {
  const c = state.combat;
  const R = c.raid;
  if (!R) return;
  if (state.route.mode !== 'stop' || !state.route.stop || state.route.stop.action !== 'raid') { c.raid = null; return; }
  R.t += dt;
  if (R.won) {
    R.wonT += dt;
    if (R.wonT >= COMBAT.victoryLeaveSec) { c.raid = null; leaveStop(state); }
    return;
  }
  if (state.train.integrity < maxIntegrity(state) * COMBAT.fleeBelow) { fleeRaid(state); return; }
  const left = R.wave !== null && (c.waves[R.wave] || c.queue.some(q => q.wave === R.wave) || c.enemies.some(e => e.wave === R.wave && alive(e)));
  if (left) return;
  R.won = true;
  const site = findSite(state.route.ring, R.site);
  const got = grant(state, raidVictory(state, site), 1);
  bus.emit('camp:raided', { site, got });
  // Avant-poste du Roi : le relais de ses bandes tombe, la traque repart de zéro
  if (site.huntReset) { const n = resetHunt(state); if (n) bus.emit('hunt:reset', { site, n }); }
}

// ---------- Forteresse (GDD §6.6, §6.7) ----------
export function startAssault(state, site) {
  const c = state.combat;
  const st = state.world.sites[site.id];
  const id = newWave(state, 'fortress');
  c.assault = { site: site.id, t: 0, reinf: 0, bossDead: false, won: false, wonT: 0 };
  queueEnemies(state, id, [site.boss || 'boss_c' + state.route.ring], 0.5);
  if (st) st.assaults = (st.assaults || 0) + 1;
}

function endAssault(state) {
  const c = state.combat;
  c.assault = null;
  if (state.route.mode === 'stop') leaveStop(state);
}

export function fleeAssault(state) {
  const c = state.combat;
  if (!c || !c.assault || c.assault.won) return false;
  onJunction(state, true);
  bus.emit('combat:fled');
  endAssault(state);
  return true;
}

function updateAssault(state, dt) {
  const c = state.combat;
  const a = c.assault;
  if (!a) return;
  if (state.route.mode !== 'stop') { c.assault = null; return; }
  a.t += dt;
  if (a.won) {
    a.wonT += dt;
    if (a.wonT >= COMBAT.victoryLeaveSec) endAssault(state);
    return;
  }
  if (!a.bossDead && a.reinf < COMBAT.reinforceSec.length && a.t >= COMBAT.reinforceSec[a.reinf]) {
    a.reinf += 1;
    launchWave(state, 'reinforce', BIOME_POOLS[state.route.ring], COMBAT.fortressBudget * threat(state), { silent: true });
    bus.emit('combat:reinforce');
  }
  if (state.train.integrity < maxIntegrity(state) * COMBAT.fleeBelow) { fleeAssault(state); return; }
  if (a.bossDead && !inCombat(state)) {
    a.won = true;
    const st = state.world.sites[a.site];
    if (st) { st.fallen = true; st.fallenLap = state.route.lap; }
    const R = COMBAT.fortressReward;
    const { keys, ...rest } = R;
    const got = grant(state, rest, getCircuit(state.route.ring).lootMult);
    state.resources.keys = Math.min(BALANCE.storage.keysCap, (state.resources.keys || 0) + keys);
    if (state.route.lapStats) state.route.lapStats.keys += keys;
    got.keys = keys;
    // Première victoire : le matériau du boss (il ouvre la zone suivante à l'atelier de la traverse)
    const loot = onBossDefeated(state, state.route.ring);
    if (loot) got.material = loot;
    moraleShock(state, BALANCE.crew.moraleVictory);
    bus.emit('combat:victory', { got });
  }
}

// ---------- Capacités du chef de train (GDD §6.5) ----------
const ABIL_SLOT = { fullsteam: 'steam', barrage: 'barrage' };

// Capacités débloquées par le palier de la locomotive (elles se cumulent)
export function unlockedAbilities(state) {
  return Object.entries(COMBAT.abilities).filter(([, A]) => A.tier <= state.train.loco).map(([id]) => id);
}

export function abilityState(state, id) {
  const A = COMBAT.abilities[id];
  const s = state.combat[ABIL_SLOT[id]] || { left: 0, cd: 0 };
  const stopped = !!A.needsRun && state.route.mode !== 'run';
  const enough = Object.entries(A.cost || {}).every(([r, v]) => (state.resources[r] || 0) >= v);
  return { active: s.left > 0, left: s.left, dur: A.dur, cd: s.cd, cdMax: A.cd, stopped, enough, ready: !stopped && s.cd <= 0 && enough };
}

export function useAbility(state, id) {
  const A = COMBAT.abilities[id];
  if (!A || A.tier > state.train.loco) return { ok: false };
  const st = abilityState(state, id);
  if (st.stopped) return { ok: false, reason: 'stopped' };
  if (st.cd > 0) return { ok: false, reason: 'cooldown' };
  if (!st.enough) return { ok: false, reason: 'cost' };
  for (const [r, v] of Object.entries(A.cost || {})) state.resources[r] -= v;
  const slot = state.combat[ABIL_SLOT[id]];
  slot.left = A.dur;
  slot.cd = A.cd;
  bus.emit('combat:ability', id);
  return { ok: true };
}

// Toucher un ennemi le marque cible prioritaire ; le toucher de nouveau enlève la marque
export function setTarget(state, id) {
  const c = state.combat;
  c.target = c.target === id ? null : id;
  return c.target;
}

// ---------- Ateliers du dépôt : réparer le convoi, refaire les munitions ----------
export function depotOffer(state, id) {
  const O = COMBAT.depot[id];
  const enough = Object.entries(O.cost).every(([r, v]) => (state.resources[r] || 0) >= v);
  const full = id === 'repair'
    ? state.train.integrity >= maxIntegrity(state) - 0.5
    : state.resources.ammo >= capacities(state).ammo - 0.5;
  return { ...O, enough, full, ok: state.route.mode === 'depot' && enough && !full };
}

export function depotBuy(state, id) {
  const o = depotOffer(state, id);
  if (!o.ok) return false;
  for (const [r, v] of Object.entries(o.cost)) state.resources[r] -= v;
  if (id === 'repair') state.train.integrity = Math.min(maxIntegrity(state), state.train.integrity + o.gain);
  else state.resources.ammo = Math.min(capacities(state).ammo, state.resources.ammo + o.gain);
  return true;
}

// ---------- Commandes de debug ----------
export function debugWave(state) {
  launchWave(state, 'wander', BIOME_POOLS[state.route.ring], 6 * threat(state));
}
// Embuscade (événement « Convoi abandonné ») : des errants surgissent
export function ambush(state, budget) {
  return launchWave(state, 'wander', BIOME_POOLS[state.route.ring], budget * threat(state));
}
export function debugAssault(state) {
  launchWave(state, 'camp', CAMP_POOLS.nomads, 6 * threat(state));
}
// Miliciens (défenseurs des villages et avant-postes, qui n'attaquent que si le camp est hostile)
export function debugMilitia(state) {
  launchWave(state, 'camp', { militia: 100 }, 6 * threat(state));
}
export function debugBoss(state) {
  const id = newWave(state, 'boss');
  queueEnemies(state, id, ['boss_c' + state.route.ring], 0.2);
}

// ---------- Pas de simulation ----------
export function updateCombat(state, dt) {
  const c = state.combat;
  if (!c) return;
  for (const slot of [c.steam, c.barrage]) {
    if (!slot) continue;
    if (slot.left > 0) slot.left = Math.max(0, slot.left - dt);
    if (slot.cd > 0) slot.cd = Math.max(0, slot.cd - dt);
  }
  const r = state.route;
  if (r.mode === 'depot') return;

  // L'intégrité remonte doucement, plus vite avec des mécaniciens à l'Atelier ou à la Fonderie
  const max0 = maxIntegrity(state);
  const mechs = state.train.wagons.filter(w => (w.type === 'workshop' || w.type === 'foundry') && !w.broken)
    .reduce((n, w) => n + workers(state, w).length, 0);
  const regen = COMBAT.regen.base + COMBAT.regen.perMechanic * mechs;
  if (state.train.integrity < max0) state.train.integrity = Math.min(max0, state.train.integrity + regen * dt);
  // Le fourgon de queue se répare aussi, deux fois plus vite (des plaques à reboulonner)
  regenCaboose(state, regen * 2, dt);

  if (r.mode === 'run') {
    // Errants
    if (c.wander && r.distance >= c.wander.at) {
      c.wander = null;
      launchWave(state, 'wander', BIOME_POOLS[r.ring], COMBAT.wanderBudget * threat(state));
    }
    // Camps : ils réagissent quand le train arrive à leur hauteur
    const up = upcomingSite(state);
    if (up && up.site.type === 'camp') {
      const key = `${r.lap}:${r.leg}:${up.site.id}`;
      const v = BALANCE.scroll.nearPxPerSec * Math.max(0.3, trainSpeed(state));
      if (c.campDone !== key && up.dist / v <= COMBAT.campApproachSec) {
        c.campDone = key;
        campReacts(state, up.site);
      }
    }
  }

  updateQueue(state, dt);
  const pos = crewPositions(state);
  updateEnemies(state, dt, pos);
  updateIncursions(state, pos, dt);
  updateTurrets(state, dt);
  updateDefenders(state, pos, dt);
  updateWaves(state);
  updateAssault(state, dt);
  updateRaid(state, dt);

  // Intégrité basse : alerte une fois ; à zéro : déraillement
  const max = maxIntegrity(state);
  if (state.train.integrity < max * COMBAT.lowIntegrity) {
    if (!c.lowWarned) { c.lowWarned = true; bus.emit('combat:lowIntegrity'); }
  } else c.lowWarned = false;
  if (state.train.integrity <= 0 && state.route.mode !== 'depot') {
    const eased = easeHunt(state, PROGRESS.huntDerailRelief);
    bus.emit('combat:derail', { eased });
    derailToDepot(state);
  }
}
