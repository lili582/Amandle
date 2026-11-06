// What an artist is. Shared by every module; keep it free of UI and game rules.

export type ArtistType = 'solo' | 'duo' | 'band'
export type Gender = 'male' | 'female' | 'mixed'

// Every genre a tile can show. There is deliberately no "other" bucket: an
// artist only enters the pool once at least one of its Wikidata genre labels
// resolves to one of these (see sources/genreRules.ts).
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
  // Year of the artist's first big song (see sources/enrich.ts). 0 = not known yet.
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
  popularityRank: number // 1..POOL_SIZE, unique per artist; 1 = most Spotify monthly listeners (see artist/rank.ts)
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
  // Set by sources/enrich.ts (MusicBrainz + Deezer, fetched on demand).
  enriched?: boolean
  imageUrl?: string
  topTrack?: TopTrack
}

// Shape of data/pool.json: the contract between the build (scripts/ + pool/,
// which write it) and the browser (data/, which reads it).
export interface PrebuiltPool {
  generatedAt: string
  source: 'spotify'
  artists: Artist[]
}
