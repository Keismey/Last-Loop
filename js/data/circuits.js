// Réseau ferroviaire (GDD §3.10 à §3.15). Au jalon J4 : anneau C1 complet.
// Chaque tronçon relie deux aiguillages ; chaque embranchement liste ses arrêts dans l'ordre.
//  signal : feu affiché tant que l'embranchement est inconnu (green / orange / red)
//  lockCost : clés pour ouvrir ; traverseTo : anneau atteint (traverse)
//  site.links : sites de ressources liés au camp (GDD §3.5)
const site = (id, type, name, extra = {}) => ({ id, type, name, ...extra });
const camp = (id, kind, name, extra = {}) => ({ id, type: 'camp', camp: kind, name, ...extra });

export const CIRCUITS = {
  1: {
    id: 1, name: 'Les Plaines de Cendre', biome: 'ash', enemyMult: 1, lootMult: 1,
    legs: [
      {
        defaultBranch: 'c1_t1_a',
        branches: [
          { id: 'c1_t1_a', name: 'Route des fermes', signal: 'green', sites: [
            site('c1_champs_ada', 'field', 'Champs de la Mère Ada'),
            camp('c1_hameau_ada', 'village', 'Hameau d’Ada', { links: ['c1_champs_ada'] })] },
          { id: 'c1_t1_b', name: 'Voie de la carrière', signal: 'green', sites: [
            site('c1_carriere', 'junkyard', 'Carrière sèche')] }
        ]
      },
      {
        defaultBranch: 'c1_t2_b',
        branches: [
          { id: 'c1_t2_a', name: 'Bois gris', signal: 'red', sites: [
            site('c1_bois_gris', 'forest', 'Bois gris'),
            camp('c1_chacals', 'raiders', 'Camp des Chacals', { defense: 1, links: ['c1_bois_gris'] })] },
          { id: 'c1_t2_b', name: 'Vieille ligne minière', signal: 'green', sites: [
            site('c1_saint_eloi', 'mine', 'Mine Saint-Éloi')] },
          { id: 'c1_t2_c', name: 'Embranchement de Cendrebourg', signal: 'green', sites: [
            site('c1_cendrebourg', 'station', 'Comptoir de Cendrebourg', { specialty: 'market' })] }
        ]
      },
      {
        defaultBranch: 'c1_t3_a',
        branches: [
          { id: 'c1_t3_a', name: 'Les épaves', signal: 'green', sites: [
            site('c1_sept_epaves', 'junkyard', 'Dépotoir des sept épaves'),
            camp('c1_ferrailleurs', 'nomads', 'Ferrailleurs du Dépotoir', { links: ['c1_sept_epaves'] })] },
          { id: 'c1_t3_b', name: 'Corridor des pillards', signal: 'red', sites: [
            camp('c1_barrage', 'raiders', 'Barrage du Corridor', { defense: 2, links: ['c1_convoi'] }),
            site('c1_convoi', 'ruins', 'Convoi éventré')] }
        ]
      },
      {
        defaultBranch: 'c1_t4_a',
        branches: [
          { id: 'c1_t4_a', name: 'Les vergers', signal: 'green', sites: [
            site('c1_verger', 'field', 'Verger calciné'),
            site('c1_haie_morte', 'forest', 'Haie morte')] },
          { id: 'c1_t4_b', name: 'La Raffinerie', signal: 'orange', lockCost: 1, sites: [
            camp('c1_garde_raffinerie', 'outpost', 'Garde de la raffinerie', { links: ['c1_raffinerie'] }),
            site('c1_raffinerie', 'ruins', 'Raffinerie abandonnée', { yieldMult: { fuel: 2 }, bonusYield: { fuel: 40 } })] }
        ]
      },
      {
        defaultBranch: 'c1_t5_a',
        branches: [
          { id: 'c1_t5_a', name: 'Vallée des pylônes', signal: 'green', sites: [
            site('c1_puits_pylones', 'mine', 'Puits des pylônes'),
            camp('c1_relais', 'village', 'Relais des pylônes', { links: ['c1_puits_pylones'] })] },
          { id: 'c1_t5_b', name: 'Gare de Fer-Blanc', signal: 'green', sites: [
            site('c1_fer_blanc', 'station', 'Gare de Fer-Blanc', { specialty: 'forge' })] },
          { id: 'c1_t5_c', name: 'La Tranchée', signal: 'red', lockCost: 2, sites: [
            camp('c1_avant_poste_roi', 'raiders', 'Avant-poste du Roi', { defense: 3 }),
            site('c1_tranchee', 'fortress', 'La Tranchée', { boss: 'boss_c1' })] }
        ]
      },
      {
        defaultBranch: 'c1_t6_a',
        branches: [
          { id: 'c1_t6_a', name: 'Plaine du retour', signal: 'green', sites: [
            site('c1_grandes_friches', 'field', 'Grandes friches')] },
          { id: 'c1_t6_b', name: 'Traverse de Verre', signal: 'green', lockCost: 3, traverseTo: 2, sites: [
            site('c1_lisiere', 'forest', 'Lisière rouillée'),
            // Atelier de traverse (idée du manager) : on y équipe la locomotive pour la zone suivante
            site('c1_atelier_traverse', 'station', 'Atelier de la Traverse', { specialty: 'traverse' })] }
        ]
      }
    ]
  }
};

export function getCircuit(ring) {
  return CIRCUITS[ring] || CIRCUITS[1];
}

export function findBranch(ring, id) {
  for (const leg of getCircuit(ring).legs) {
    const b = leg.branches.find(x => x.id === id);
    if (b) return b;
  }
  return null;
}

export function findSite(ring, id) {
  for (const leg of getCircuit(ring).legs) {
    for (const b of leg.branches) {
      const s = b.sites.find(x => x.id === id);
      if (s) return s;
    }
  }
  return null;
}
