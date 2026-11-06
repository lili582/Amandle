import type { Artist } from '../artist'
import type { TileField } from './types'
import { strings } from '../text'
import { artistAge, breakthroughOf, isDeceased } from '../artist'

// Display text for a tile's value (pure; kept out of the component file so
// fast-refresh can hot-reload components safely).
export function tileValue(artist: Artist, field: TileField): string {
  switch (field) {
    case 'breakthrough': {
      const y = breakthroughOf(artist)
      return y > 0 ? String(y) : '—'
    }
    case 'members':
      if (artist.type === 'solo') return strings.membersValues.solo
      return artist.members > 0 ? String(artist.members) : strings.membersValues.unknown
    case 'popularity':
      return `#${Math.max(1, Math.round(artist.popularityRank))}`
    case 'gender':
      return strings.genderValues[artist.gender]
    case 'genre':
      return strings.genreValues[artist.primaryGenre] ?? artist.primaryGenre
    case 'age': {
      const age = artistAge(artist)
      if (age <= 0) return '—'
      return isDeceased(artist) ? strings.ageDeceased.replace('{age}', String(age)) : String(age)
    }
  }
}
