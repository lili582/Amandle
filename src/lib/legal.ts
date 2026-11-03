import { CONTACT_EMAIL, GAME_NAME, LEGAL_UPDATED, OWNER_NAME } from '../config'

// Fills the {owner}/{email}/{updated}/{game} placeholders in src/legal.he.ts.
export function fillLegal(text: string): string {
  return text
    .replaceAll('{owner}', OWNER_NAME)
    .replaceAll('{email}', CONTACT_EMAIL)
    .replaceAll('{updated}', LEGAL_UPDATED)
    .replaceAll('{game}', GAME_NAME)
}
