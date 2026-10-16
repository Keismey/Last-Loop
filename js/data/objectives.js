// Objectifs du carnet de bord (GDD §11), par zone : ils montrent le chemin de la zone et récompensent
// modestement (les clés sont rares : deux en zone 1). check : condition (sim/objectives.js), n : seuil.
export const OBJECTIVES = {
  1: [
    { id: 'z1_lap', check: 'laps', n: 1, reward: { scrap: 20 } },
    { id: 'z1_gatherer', check: 'wagon', type: 'gatherer', n: 1, reward: { parts: 10 } },
    { id: 'z1_crew', check: 'crew', n: 6, reward: { food: 30 } },
    { id: 'z1_kills', check: 'kills', n: 15, reward: { ammo: 15 } },
    { id: 'z1_explore', check: 'explored', n: 10, reward: { keys: 1 } },
    { id: 'z1_ally', check: 'ally', n: 1, reward: { parts: 20 } },
    { id: 'z1_loco', check: 'loco', n: 2, reward: { keys: 1 } },
    { id: 'z1_research', check: 'research', n: 3, reward: { parts: 15 } },
    { id: 'z1_boss', check: 'boss', ring: 1, n: 1, reward: { scrap: 40 } },
    { id: 'z1_kit', check: 'kit', kit: 'cooler', n: 1, reward: { scrap: 40, parts: 20 } }
  ],
  // Zones 2 et 3 : la forme est posée, le détail viendra avec leur contenu
  2: [
    { id: 'z2_loco', check: 'loco', n: 3, reward: { keys: 1 } },
    { id: 'z2_research', check: 'research', n: 9, reward: { parts: 30 } },
    { id: 'z2_boss', check: 'boss', ring: 2, n: 1, reward: { scrap: 60 } },
    { id: 'z2_kit', check: 'kit', kit: 'icebreaker', n: 1, reward: { scrap: 60, parts: 30 } }
  ],
  3: [
    { id: 'z3_loco', check: 'loco', n: 4, reward: { keys: 1 } },
    { id: 'z3_boss', check: 'boss', ring: 3, n: 1, reward: { scrap: 80 } }
  ]
};
