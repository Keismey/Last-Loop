// Événements aléatoires (GDD §7) : tirage à l'entrée d'un embranchement, ouverture pendant le transit,
// résolution des choix. Pendant qu'une carte est ouverte, la simulation est en pause (simulate.js).
import { EVENTS, EVENT_RULES, EVENT_FX as F } from '../data/events.js';
import { ROUTE } from '../data/sites.js';
import { BALANCE } from '../data/balance.js';
import { getCircuit } from '../data/circuits.js';
import { capacities } from '../core/state.js';
import { rngNext } from '../core/rng.js';
import { bus } from '../core/bus.js';
import { createSurvivor, bedsTotal } from './crew.js';
import { inCombat, ambush } from './combat.js';
import { addGain } from './route.js';
import { addLog } from './log.js';

const canPay = (state, cost) => Object.entries(cost || {}).every(([r, v]) => (state.resources[r] || 0) >= v);
const pay = (state, cost) => { for (const [r, v] of Object.entries(cost || {})) state.resources[r] -= v; };
const S = state => getCircuit(state.route.ring).lootMult * BALANCE.incomeMult;

function ensure(state) {
  if (!state.events) state.events = { pending: null, active: null, last: null, fx: [] };
  if (!state.events.fx) state.events.fx = [];
  return state.events;
}

export const eventActive = state => !!(state.events && state.events.active);

// Entrée dans un embranchement : 22 % de chance qu'un événement survienne pendant le premier transit
export function rollEvent(state) {
  const E = ensure(state);
  E.pending = null;
  const r = state.route;
  if (EVENT_RULES.notFirstLeg && r.lap === 1 && r.leg === 0) return;
  if (rngNext(state) >= EVENT_RULES.chance) return;
  const [a, b] = EVENT_RULES.at;
  E.pending = { at: r.legStart + ROUTE.transit * (a + (b - a) * rngNext(state)), id: pickEvent(state) };
}

function pickEvent(state) {
  const E = ensure(state);
  const list = Object.entries(EVENTS).filter(([id]) => id !== E.last);
  const total = list.reduce((n, [, e]) => n + e.weight, 0);
  let x = rngNext(state) * total;
  for (const [id, e] of list) { x -= e.weight; if (x <= 0) return id; }
  return list[list.length - 1][0];
}

// Pas de simulation : ouverture de la carte quand le train atteint le point prévu (en roulant, hors combat)
export function updateEvents(state, dt) {
  const E = ensure(state);
  // Effets temporaires (tempête, surchauffe, rail)
  if (E.fx.length) {
    for (const f of E.fx) f.left -= dt;
    E.fx = E.fx.filter(f => f.left > 0);
  }
  const r = state.route;
  if (!E.pending || E.active || r.mode !== 'run') return;
  if (r.distance < E.pending.at) return;
  if (inCombat(state)) { E.pending.at = r.distance + 240; return; }    // on attend la fin du combat
  E.active = { id: E.pending.id };
  E.pending = null;
  E.last = E.active.id;
  bus.emit('event:open', E.active);
}

// Debug : ouvre tout de suite un événement (au hasard, ou celui demandé)
export function debugEvent(state, id) {
  const E = ensure(state);
  if (E.active) return;
  E.active = { id: id || pickEvent(state) };
  E.last = E.active.id;
  bus.emit('event:open', E.active);
}

// Multiplicateur de vitesse des effets en cours (0 = train arrêté pour réparer la voie)
export function eventSpeed(state) {
  const fx = state.events && state.events.fx;
  if (!fx || !fx.length) return 1;
  return fx.reduce((m, f) => m * (f.speed ?? 1), 1);
}

// Un choix est-il possible ? { ok, reason }
export function choiceState(state, eventId, choiceId) {
  const ch = EVENTS[eventId].choices.find(c => c.id === choiceId);
  if (!ch) return { ok: false };
  if (ch.need === 'bed' && state.crew.length >= bedsTotal(state)) return { ok: false, reason: 'bed' };
  if (ch.need === 'savoir3' && !state.crew.some(s => (s.skills.sav || 0) >= F.mapSavoir)) return { ok: false, reason: 'savoir' };
  if (!canPay(state, ch.cost)) return { ok: false, reason: 'cost' };
  return { ok: true };
}

function grant(state, loot) {
  const caps = capacities(state);
  const got = {};
  for (const [r, v] of Object.entries(loot)) {
    const before = state.resources[r] || 0;
    state.resources[r] = Math.min(caps[r] ?? Infinity, before + v);
    const real = state.resources[r] - before;
    if (real > 0) { got[r] = Math.round(real); addGain(state, r, real); }
  }
  return got;
}

const pickCrew = (state, filter = () => true) => {
  const list = state.crew.filter(filter);
  return list.length ? list[Math.floor(rngNext(state) * list.length)] : null;
};

// Résolution : applique le choix, renvoie { key, params } pour le texte du résultat
export function resolveEvent(state, choiceId) {
  const E = ensure(state);
  const ev = E.active;
  if (!ev) return null;
  const c = choiceState(state, ev.id, choiceId);
  if (!c.ok) return null;
  const ch = EVENTS[ev.id].choices.find(x => x.id === choiceId);
  pay(state, ch.cost);
  const k = S(state);
  let res = { key: `ev.${ev.id}.${choiceId}.res`, params: {} };
  const p = res.params;
  switch (`${ev.id}.${choiceId}`) {
    case 'survivor.welcome': {
      const s = createSurvivor(state);
      state.crew.push(s);
      p.name = s.first;
      bus.emit('crew:recruited', s);
      bus.emit('crew:changed');
      break;
    }
    case 'convoy.search': {
      p.got = grant(state, { scrap: F.convoyScrap * k });
      if (rngNext(state) < F.ambushChance) {
        ambush(state, F.ambushBudget);
        res.key = 'ev.convoy.search.ambush';
      }
      break;
    }
    case 'merchant.ammo': p.got = grant(state, { ammo: F.merchantAmmo }); break;
    case 'merchant.parts': p.got = grant(state, { parts: F.merchantParts }); break;
    case 'storm.rush': {
      // Pleine vapeur offerte, sans attente ni coût
      state.combat.steam.left = Math.max(state.combat.steam.left, F.stormSteamSec);
      break;
    }
    case 'storm.slow': E.fx.push({ id: 'slow', speed: F.slowMult, left: F.slowSec }); break;
    case 'storm.endure': state.train.integrity = Math.max(1, state.train.integrity - F.stormDamage); break;
    case 'mechanic.help': {
      p.got = grant(state, { parts: F.mechanicParts * k });
      const s = pickCrew(state);
      if (s && s.skills.mec < 10) { s.skills.mec += 1; p.name = s.first; } else res.key = 'ev.mechanic.help.resNoSkill';
      bus.emit('crew:changed');
      break;
    }
    case 'rail.repair': E.fx.push({ id: 'rail', speed: 0, left: F.railStopSec }); break;
    case 'rail.force': {
      if (rngNext(state) < F.railChance) state.train.integrity = Math.max(1, state.train.integrity - F.railDamage);
      else res.key = 'ev.rail.force.resLucky';
      break;
    }
    case 'warehouse.take': {
      p.got = grant(state, { food: F.warehouseFood * k });
      for (const s of state.crew) s.morale = Math.min(100, s.morale + F.warehouseMorale);
      break;
    }
    case 'epidemic.isolate': {
      const s = pickCrew(state, x => x.state !== 'critical');
      if (s) { s.hp = Math.min(s.hp, F.isolateHp); p.name = s.first; bus.emit('crew:changed'); }
      break;
    }
    case 'epidemic.ignore': {
      for (const s of state.crew) s.morale = Math.max(0, s.morale - F.epidemicMorale);
      if (rngNext(state) < F.epidemicInjureChance) {
        const s = pickCrew(state, x => x.state !== 'critical');
        if (s) { s.hp = Math.min(s.hp, 20); p.name = s.first; res.key = 'ev.epidemic.ignore.resSick'; bus.emit('crew:changed'); }
      }
      break;
    }
    case 'map.decode': {
      state.resources.keys = Math.min(BALANCE.storage.keysCap, (state.resources.keys || 0) + 1);
      if (state.route.lapStats) state.route.lapStats.keys += 1;
      break;
    }
    case 'map.burn': p.got = grant(state, { fuel: F.burnFuel }); break;
    case 'overheat.force': {
      E.fx.push({ id: 'force', speed: F.forceMult, left: F.forceSec });
      if (rngNext(state) < F.boilerBreakChance) {
        const w = state.train.wagons.find(x => x.type === 'boiler' && !x.broken);
        if (w) { w.broken = true; w.repairT = 0; bus.emit('wagon:broken', w); res.key = 'ev.overheat.force.resBroke'; }
      }
      break;
    }
    default: break;
  }
  E.active = null;
  addLog(state, 'log.event', { ev: ev.id, choice: choiceId });
  bus.emit('event:resolved', { id: ev.id, choice: choiceId });
  return res;
}

