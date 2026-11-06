// sources/ — Talking to outside websites: Wikidata, Hebrew Wikipedia (categories and
// page views), Spotify, MusicBrainz and Deezer. Each file is one source.
// Used by pool/ and scripts/ at build time, and by data/ and game/ in the
// browser (fallback pool, on-demand pictures and top tracks).
//
// This file is the module's interface: other modules import from here only.
// Files inside sources/ import each other directly.

export { debutFromReleaseGroups, enrichArtist, genderOfMembers, membersFromRelations } from './enrich'
export { fetchCategoryCandidates } from './hewikiCategories'
export { applyPageviewRanks } from './popularity'
export { fetchSpotifyImage, israelAudience, parseMonthlyListeners, parseTopCities, rankBySpotify } from './spotify'
export type { CityListeners, SpotifyHit } from './spotify'
export { buildArtists, fetchArtistPool, fetchMissingSpotifyCandidates, fetchPoolRows, hebrewSingerQids, matchesCandidate, nonHebrewQids, spotifyIdsByQid } from './wikidata'
export type { SearchCandidate, SparqlRow } from './wikidata'
