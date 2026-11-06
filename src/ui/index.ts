// ui/ — React screens and dialogs. Reads from game/, data/, storage/ and text/;
// nothing imports ui/ except App.tsx.
//
// This file is the module's interface: other modules import from here only.
// Files inside ui/ import each other directly.

export { Game } from './Game'
export { LegalFooter } from './components/LegalFooter'
