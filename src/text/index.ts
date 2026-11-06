// text/ — Every Hebrew text the player sees: UI strings and the legal pages.
//
// This file is the module's interface: other modules import from here only.
// Files inside text/ import each other directly.

export { LEGAL_IDS, legalDocs, legalLabels, legalStrings } from './legal.he'
export type { LegalDocId } from './legal.he'
export { fillLegal } from './legal'
export { strings } from './strings.he'
