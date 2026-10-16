// Carnet de bord : les faits marquants du voyage, du plus récent au plus ancien (40 au plus).
// Chaque entrée : { lap, key, ...paramètres du texte }.
const MAX = 40;

export function addLog(state, key, params = {}) {
  if (!state) return;
  if (!Array.isArray(state.log)) state.log = [];
  state.log.unshift({ lap: state.route ? state.route.lap : 1, key, ...params });
  if (state.log.length > MAX) state.log.length = MAX;
}
