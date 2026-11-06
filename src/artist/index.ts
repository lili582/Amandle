// artist/ — What an artist is, and the rules every part of the app agrees on:
// the Artist type, when an artist is complete, ranks 1..N, ages, Hebrew name
// normalising, and the hand-checked artists and genres.
// Pure: no network, no browser storage. Every other module may import it.
//
// This file is the module's interface: other modules import from here only.
// Files inside artist/ import each other directly.

export { artistAge, breakthroughOf, isDeceased } from './age'
export { CURATED_ARTISTS, curatedArtist, curatedFor, DEEZER_IDS, EXCLUDED_QIDS } from './curatedArtists'
export { applyGenreOverride, GENRE_OVERRIDES } from './genreOverrides'
export { normalizeHe, skeletonOf } from './normalizeHe'
export { assignRanks, compareByPopularity, normalizeRanks, ranksAreDense } from './rank'
export type { Artist, ArtistType, Gender, Genre, PrebuiltPool, TopTrack } from './types'
