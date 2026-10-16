// Survivants : création, efficacité, besoins, progression, postes (GDD §5).
import { BALANCE } from '../data/balance.js';
import { WAGONS, AUTO_PRIORITY, slotCount, bedCount } from '../data/wagons.js';
import { BUILD } from '../data/build.js';
import { FIRST_NAMES, NICKNAMES, LOOKS } from '../data/names.js';
import { rngNext } from '../core/rng.js';
import { capacities } from '../core/state.js';
import { bus } from '../core/bus.js';
import { carById } from './caboose.js';
import { COMBAT } from '../data/enemies.js';
import { fx } from './research.js';
import { maxIntegrity } from './combat.js';

export const SKILLS = ['mec', 'ter', 'com', 'sav'];
const C = () => BALANCE.crew;

// ---------- Création ----------
export function createSurvivor(state, main, mainLevel = C().startMainLevel) {
  const r = () => rngNext(state);
  const used = new Set(state.crew.map(s => s.first));
  let first = FIRST_NAMES[Math.floor(r() * FIRST_NAMES.length)];
  for (let i = 0; i < 20 && used.has(first); i++) first = FIRST_NAMES[Math.floor(r() * FIRST_NAMES.length)];
  main = main || SKILLS[Math.floor(r() * SKILLS.length)];
  const skills = {};
  for (const k of SKILLS) skills[k] = k === main ? mainLevel : 1 + Math.floor(r() * 2);
  const nick = r() < 1 / 3 ? NICKNAMES[main][Math.floor(r() * 3)] : null;
  state.nextCrewId = (state.nextCrewId || 0) + 1;
  return {
    id: 'c' + state.nextCrewId,
    first,
    nick,
    main,
    look: {
      skin: Math.floor(r() * LOOKS.skin.length),
      hair: Math.floor(r() * LOOKS.hair.length),
      outfit: Math.floor(r() * LOOKS.outfit.length),
      style: Math.floor(r() * LOOKS.hairStyle),
      acc: Math.floor(r() * LOOKS.accessory)
    },
    skills,
    xp: { mec: 0, ter: 0, com: 0, sav: 0 },
    hp: 100,
    morale: 70,
    state: 'idle',          // idle | working | injured | critical
    post: null,             // { wagon: id, slot: n } ou null (au repos)
    weapon: null,           // id d'objet de l'inventaire (null = à mains nues)
    armor: null,
    critical: 0,            // secondes restantes en état critique
    workClock: 0
  };
}

// Équipage de départ : 4 survivants, un par compétence principale, tous au repos (GDD §4.6, §5.4)
export function seedCrew(state) {
  state.crew = [];
  for (const main of C().startMains) state.crew.push(createSurvivor(state, main));
  return state;
}

export function displayName(s) {
  return s.nick ? `${s.first} ${s.nick}` : s.first;
}

// ---------- Efficacité ----------
export function efficiency(s, skill) {
  const lvl = skill ? s.skills[skill] : 1;
  return (1 + C().effPerSkill * (lvl - 1)) * (0.7 + 0.3 * s.morale / 100);
}

// ---------- Capacité et couchages ----------
export function bedsTotal(state) {
  return state.train.wagons.reduce((n, w) => n + bedCount(w), 0) + C().cabinBeds;
}

export function bestBunkLevel(state) {
  return state.train.wagons.filter(w => w.type === 'bunk').reduce((m, w) => Math.max(m, w.level), 0);
}

// Survivants au repos, répartis dans les couchages (Dormoirs puis Couchettes) ; sans lit, on dort par terre
export function restingPlaces(state) {
  const resting = state.crew.filter(s => !s.post);
  const places = [];
  // Dormoirs d'abord, puis les Couchettes des toits
  for (const w of state.train.wagons) {
    const def = WAGONS[w.type];
    const n = def && def.beds ? def.beds[w.level - 1] : 0;
    for (let i = 0; i < n; i++) places.push({ wagon: w.id, bed: i });
  }
  for (const w of state.train.wagons) {
    if (!w.berths) continue;
    for (let i = 0; i < BUILD.berths.beds; i++) places.push({ wagon: w.id, bed: i, roof: true });
  }
  for (let i = 0; i < C().cabinBeds; i++) places.push({ wagon: 'loco', bed: i });
  return resting.map((s, i) => ({ s, place: places[i] || null }));
}

// ---------- Postes ----------
export function occupant(state, wagonId, slot) {
  return state.crew.find(s => s.post && s.post.wagon === wagonId && s.post.slot === slot) || null;
}

export function canWork(s) {
  return s.state !== 'injured' && s.state !== 'critical';
}

// Affecte un survivant à un poste ; échange s'il est occupé. Renvoie true si quelque chose a changé.
export function assign(state, s, wagonId, slot) {
  const w = carById(state, wagonId);
  if (!w || !canWork(s) || slot >= slotCount(w)) return false;
  const other = occupant(state, wagonId, slot);
  if (other === s) return false;
  if (other) {
    other.post = s.post ? { ...s.post } : null;
    other.state = other.post ? 'working' : 'idle';
  }
  s.post = { wagon: wagonId, slot };
  s.state = 'working';
  bus.emit('crew:changed');
  return true;
}

export function unassign(state, s) {
  if (!s.post) return false;
  s.post = null;
  if (s.state === 'working') s.state = 'idle';
  bus.emit('crew:changed');
  return true;
}

// Bouton « Auto » : chaque poste libre reçoit le meilleur survivant libre pour sa compétence
// (un premier poste dans chaque wagon, dans l'ordre de priorité, avant les seconds postes)
export function autoAssign(state) {
  let changed = false;
  // Un poste par wagon d'abord (dans l'ordre de priorité), puis les seconds postes, etc.
  const maxSlots = Math.max(0, ...state.train.wagons.map(slotCount));
  for (let slot = 0; slot < maxSlots; slot++) for (const type of AUTO_PRIORITY) {
    const skill = WAGONS[type].skill;
    for (const w of state.train.wagons.filter(x => x.type === type)) {
      {
        if (slot >= slotCount(w) || occupant(state, w.id, slot)) continue;
        const free = state.crew.filter(s => !s.post && canWork(s));
        if (!free.length) {
          if (changed) bus.emit('crew:changed');
          return changed;
        }
        free.sort((a, b) => b.skills[skill] - a.skills[skill] || b.hp - a.hp);
        free[0].post = { wagon: w.id, slot };
        free[0].state = 'working';
        changed = true;
      }
    }
  }
  if (changed) bus.emit('crew:changed');
  return changed;
}

// Travailleurs d'un wagon, avec leur efficacité dans la compétence du wagon
export function workers(state, w) {
  const skill = WAGONS[w.type] && WAGONS[w.type].skill;
  // Seuls les postes de travail comptent (pas les places « réparation » ou « renfort »)
  return state.crew.filter(s => s.post && s.post.wagon === w.id && typeof s.post.slot === 'number' && canWork(s))
    .map(s => ({ s, eff: efficiency(s, skill) }));
}

// Expérience dans une compétence ; passage de niveau à 40 × niveau points
export function addXp(state, s, skill, n) {
  s.xp[skill] = (s.xp[skill] || 0) + n * (1 + fx(state, 'xp'));   // Formation (recherche)
  if (s.xp[skill] >= C().xpPerLevel * s.skills[skill] && s.skills[skill] < 10) {
    s.xp[skill] = 0;
    s.skills[skill] += 1;
    bus.emit('crew:levelup', { s, skill });
  }
}

// ---------- Moral ----------
// Ce qui fixe le moral visé par tout l'équipage (le moral de chacun y tend doucement) ; affiché dans la fiche
export function moraleFactors(state) {
  const c = C();
  const caps = capacities(state);
  const bunk = bestBunkLevel(state);
  const out = [{ key: 'base', v: c.moraleBase }];
  if (bunk) out.push({ key: 'bunk', v: c.moralePerBunkLevel * bunk });
  if (fx(state, 'morale')) out.push({ key: 'canteen', v: fx(state, 'morale') });
  if (state.resources.food <= 0) out.push({ key: 'starving', v: c.starveMorale });
  else if (state.resources.food > caps.food * 0.25) out.push({ key: 'fed', v: c.moraleFed });
  if (state.crew.length > bedsTotal(state)) out.push({ key: 'crowded', v: c.moraleCrowded });
  if (state.train.integrity < maxIntegrity(state) * COMBAT.lowIntegrity) out.push({ key: 'integrity', v: c.moraleLowIntegrity });
  return out;
}
export const moraleTarget = state => Math.max(0, Math.min(100, moraleFactors(state).reduce((a, f) => a + f.v, 0)));

// Coup au moral (ou regain) immédiat pour tout l'équipage
export function moraleShock(state, d) {
  for (const s of state.crew) s.morale = Math.max(0, Math.min(100, s.morale + d));
}

// ---------- Besoins, soins, progression (chaque pas de simulation) ----------
export function updateCrew(state, dt) {
  const c = C();
  const fed = state.resources.food > 0;
  const bunk = bestBunkLevel(state);
  const target = moraleTarget(state);
  const restHeal = c.restHeal * (1 + 0.3 * (Math.max(1, bunk) - 1)) * (1 + fx(state, 'heal'));

  for (const s of [...state.crew]) {
    // Moral
    const dm = target - s.morale;
    s.morale += Math.sign(dm) * Math.min(Math.abs(dm), c.moraleRate * dt);

    // État critique : compte à rebours avant la mort
    if (s.state === 'critical') {
      s.critical -= dt;
      if (s.critical <= 0) {
        // Garde-fou : l'équipage ne descend jamais sous le minimum ; les derniers tiennent bon, à terre
        if (protectedCrew(state)) s.critical = 0;
        else kill(state, s, fed ? 'wounds' : 'hunger');
      }
      continue;
    }

    // PV
    if (!fed) s.hp -= c.starveHpPerSec * dt;
    else s.hp += (s.post ? c.workHeal : restHeal) * dt;
    s.hp = Math.min(100, s.hp);

    if (s.hp <= 0) {
      s.hp = 0;
      s.state = 'critical';
      s.critical = c.criticalSec;
      s.post = null;
      bus.emit('crew:critical', s);
      bus.emit('crew:changed');
      continue;
    }
    // Blessé : quitte son poste… sauf en plein combat, où il tient jusqu'au bout (à la Fallout Shelter)
    const pw = s.post && carById(state, s.post.wagon);
    const holding = !!(pw && pw.attacked);
    if (s.hp < c.injuredBelow && s.state !== 'injured') {
      s.state = 'injured';
      if (!holding) s.post = null;
      bus.emit('crew:injured', s);
      bus.emit('crew:changed');
    } else if (s.state === 'injured' && s.post && !holding) {
      s.post = null;
      bus.emit('crew:changed');
    } else if (s.state === 'injured' && s.hp >= c.backToWorkAt) {
      s.state = 'idle';
      bus.emit('crew:changed');
    }

    // Expérience : 1 point toutes les 10 s de travail dans la compétence du poste
    if (s.post && s.state === 'working') {
      const w = carById(state, s.post.wagon);
      // Réparer fait progresser en Mécanique, quel que soit le wagon
      const skill = s.post.slot === 'repair' ? 'mec' : s.post.slot === 'defend' ? null : (w && WAGONS[w.type].skill);
      if (skill) {
        s.workClock += dt;
        while (s.workClock >= c.xpEverySec) {
          s.workClock -= c.xpEverySec;
          addXp(state, s, skill, 1);
        }
      }
    }
  }

  // Garde-fou : passager clandestin si l'équipage tombe sous 3 (GDD §5.3)
  if (state.crew.length < c.stowawayBelow) {
    state.stowawayClock = (state.stowawayClock || 0) + dt;
    if (state.stowawayClock >= c.stowawayDelaySec) {
      state.stowawayClock = 0;
      const s = createSurvivor(state, null, 2);
      state.crew.push(s);
      bus.emit('crew:joined', s);
      bus.emit('crew:changed');
    }
  } else {
    state.stowawayClock = 0;
  }
}

// Garde-fou anti game over : sous ce nombre de survivants, plus personne ne meurt
export const protectedCrew = state => state.crew.length <= C().minCrew;

// Sauver un survivant critique en le couchant (glissé sur un Dormoir)
export function rescue(state, s) {
  if (s.state !== 'critical') return false;
  s.state = 'injured';
  s.hp = C().criticalSavedHp;
  s.critical = 0;
  bus.emit('crew:rescued', s);
  bus.emit('crew:changed');
  return true;
}

function kill(state, s, cause) {
  state.crew = state.crew.filter(x => x !== s);
  state.memorial = state.memorial || [];
  state.memorial.push({ name: displayName(s), lap: state.route.lap, cause });
  moraleShock(state, C().moraleDeath);
  bus.emit('crew:died', s);
  bus.emit('crew:changed');
}
