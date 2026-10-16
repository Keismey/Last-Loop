// Notes de mise à jour dans la langue du jeu
import { IS_EN } from '../core/i18n.js';
import { PATCH_NOTES as FR } from './patchnotes.fr.js';
import { PATCH_NOTES as EN } from './patchnotes.en.js';
export const PATCH_NOTES = IS_EN ? EN : FR;
