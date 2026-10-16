// Un pas de simulation de la partie (aucun affichage ici, GDD §17.3).
// Au dépôt (Halte, GDD §3.16), le temps de jeu est figé : rien ne se produit ni ne se consomme.
import { updateEconomy } from './energy.js';
import { updateCrew } from './crew.js';
import { updateRoute, isHalte } from './route.js';
import { updateCombat } from './combat.js';
import { updateEvents, eventActive } from './events.js';

export function simulate(state, dt) {
  // Halte, ou carte d'événement ouverte : le temps est figé
  if (isHalte(state) || eventActive(state)) {
    state.route.prevDistance = state.route.distance;
    return;
  }
  state.time += dt;
  state.stats.playTime += dt;
  updateEconomy(state, dt);
  updateCrew(state, dt);
  updateRoute(state, dt);
  updateCombat(state, dt);
  updateEvents(state, dt);
}
