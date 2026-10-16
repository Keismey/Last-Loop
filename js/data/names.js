// Prénoms et surnoms des survivants (GDD §20.6)
export const FIRST_NAMES = [
  'Clémence', 'Mara', 'Lise', 'Nora', 'Inès', 'Yuna', 'Zélie', 'Rosa', 'Agathe', 'Maëlle', 'Sacha', 'Lou',
  'Jeanne', 'Odile', 'Fatou', 'Mina', 'Irène', 'Salomé', 'Leïla', 'Capucine', 'Edith', 'Nadia', 'Sienna',
  'Prune', 'Alba', 'Hélène', 'Suzon', 'Kenza', 'Rita', 'Margot', 'Tom', 'Basile', 'Elio', 'Malik', 'Gaston',
  'Victor', 'Noé', 'Ilyes', 'Félix', 'Hugo', 'Anatole', 'Joseph', 'Samir', 'Léon', 'Marius', 'Ernest',
  'Yanis', 'Bastien', 'Oscar', 'Ruben', 'Achille', 'Firmin', 'Kofi', 'Lucien', 'Émile', 'Théo', 'Raoul',
  'Isaac', 'Jules', 'Armand'
];

// Les 30 premiers prénoms sont féminins, les suivants masculins (choix de la base dessinée)
export const isFemale = first => { const i = FIRST_NAMES.indexOf(first); return i >= 0 && i < 30; };

// Surnom selon la compétence principale (1 chance sur 3)
export const NICKNAMES = {
  mec: ['la Clé', 'Boulon', 'Main-de-fer'],
  ter: ['la Pelle', 'Pied-léger', 'Racine'],
  com: ['l’Œil', 'Tir-sec', 'la Gâchette'],
  sav: ['le Prof', 'Lunettes', 'la Plume']
};

// Apparence des pantins (GDD §15.2)
export const LOOKS = {
  skin: ['#f1c9a5', '#e0ac82', '#c68b5e', '#a8704a', '#7d4f33', '#5a3825'],
  // Teintes de l'Après : délavées, poussiéreuses (pas de couleurs vives). Ajouter à la fin : les sauvegardes gardent l'index.
  hair: ['#2b2420', '#5a3a22', '#7e5530', '#b39463', '#9c968e', '#8a4a2c'],
  outfit: ['#4b6461', '#5e6644', '#7a4630', '#4e5868', '#6e5640', '#64585f', '#7d6a45', '#55524f'],
  hairStyle: 6,   // court, chignon, long, rasé, bouclé, crête
  accessory: 5    // aucun, lunettes de soudeur, foulard, casquette, casque
};
