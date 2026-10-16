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
  hair: ['#2b2420', '#5a3a22', '#8c5a2b', '#c9a15c', '#a8a29a', '#b5562b'],
  outfit: ['#3E8E8A', '#6b7f4e', '#8f4426', '#5c6a82', '#7a5c40', '#8a6f8e'],
  hairStyle: 6,   // court, chignon, long, rasé, bouclé, crête
  accessory: 5    // aucun, lunettes de soudeur, foulard, casquette, casque
};
