// Shared domain types. Keep this file free of UI concerns.

export type ArtistType = 'solo' | 'duo' | 'band'
export type Gender = 'male' | 'female' | 'mixed'

// Every genre a tile can show. There is deliberately no "other" bucket: an
// artist only enters the pool once at least one of its Wikidata genre labels
// resolves to one of these (see lib/genreRules.ts).
export type Genre =
  | 'pop'
  | 'mizrahi'
  | 'rock'
  | 'hiphop'
  | 'mediterranean'
  | 'electronic'
  | 'ethnic-world'
  | 'folk-israeli'
  | 'indie-alt'
  | 'religious-pop'
  | 'jazz-soul'
  | 'classical'

export interface TopTrack {
  title: string
  preview?: string // 30-second MP3 preview from Deezer
  link?: string // deezer.com track page
}

export interface Artist {
  id: string // stable slug, e.g. "omer-adam"
  nameHe: string // display name: the Hebrew Wikipedia title without its "(להקה)"-style disambiguator
  wikiTitle: string // exact Hebrew Wikipedia article title (used for page views)
  nameEn?: string
  aliases: string[] // extra searchable names
  // Career start from Wikidata (or the first album on MusicBrainz). Used as
  // the breakthrough year when no hit could be dated. 0 = unknown.
  debutYear: number
  // Year of the artist's first big song (see lib/enrich.ts). 0 = not known yet.
  breakthroughYear: number
  birthYear?: number // solo artists
  diedYear?: number // solo artists
  foundedYear?: number // groups: formation year (Wikidata P571 / P2031)
  type: ArtistType
  members: number // 1 solo, 2 duo, N band, 0 = unknown (until enriched)
  gender: Gender
  genderKnown: boolean // false = group whose members' genders are not on Wikidata yet
  primaryGenre: Genre
  secondaryGenres: Genre[]
  popularityRank: number // 1..POOL_SIZE, unique per artist; 1 = most Spotify monthly listeners (see lib/rank.ts)
  answerEligible: boolean
  ids: {
    wikidata: string
    musicbrainz?: string
    deezer?: number
    spotify?: string // the artist's biggest Spotify profile (nightly pool only)
  }
  metrics: {
    wikidataSitelinks: number
    hewikiViews60d: number
    spotifyListeners?: number // Spotify monthly listeners - the ranking score (pool build only)
    spotifyListenersIL?: number // estimated listeners in Israel - Israel filter and listener floor (pool build only)
  }
  // Set by lib/enrich.ts (MusicBrainz + Deezer, fetched on demand).
  enriched?: boolean
  imageUrl?: string
  topTrack?: TopTrack
}

// ---- Comparison / game types ----

export type Match = 'correct' | 'close' | 'wrong'

// Spotle's tile order: breakthrough year in place of the debut album, and age
// in place of nationality (every artist here is Israeli).
export const TILE_FIELDS = ['breakthrough', 'members', 'popularity', 'gender', 'genre', 'age'] as const
export type TileField = (typeof TILE_FIELDS)[number]

export interface TileResult {
  field: TileField
  match: Match
  // 'up' = the target value is HIGHER (later year / more popular) than the guess
  arrow?: 'up' | 'down'
  // The guessed artist's value as shown when the guess was made, so a saved
  // board renders the same after a reload.
  value?: string
}

export type GameStatus = 'playing' | 'won' | 'lost'

export interface GuessRecord {
  artistId: string
  tiles: TileResult[]
}

export interface SaveState {
  guesses: GuessRecord[]
  status: GameStatus
  date: string
}

export interface StatsState {
  played: number
  wins: number
  streak: number
  maxStreak: number
  dist: number[]
  lastWinDate: string | null
}
