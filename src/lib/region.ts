// No longer used: the region tile was replaced by the age tile.
// Safe to delete together with tests/region.test.ts.
export type Region = 'north' | 'center' | 'tel-aviv' | 'jerusalem' | 'south' | 'abroad'

export function parsePoint(wkt: string | undefined): { lat: number; lon: number } | null {
  const m = wkt ? /Point\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s*\)/i.exec(wkt) : null
  return m ? { lon: Number(m[1]), lat: Number(m[2]) } : null
}

function inside(lat: number, lon: number): boolean {
  return lat >= 29.4 && lat <= 33.45 && lon >= 34.2 && lon <= 35.95
}

export function regionFromPoint(p: { lat: number; lon: number } | null, _country?: string): Region | undefined {
  if (!p) return undefined
  const { lat, lon } = p
  if (!inside(lat, lon)) return 'abroad'
  if (Math.hypot(lat - 31.778, lon - 35.22) <= 0.25) return 'jerusalem'
  if (Math.hypot(lat - 32.07, lon - 34.8) <= 0.13) return 'tel-aviv'
  if (lat >= 32.5) return 'north'
  if (lat < 31.7) return 'south'
  return 'center'
}

const N: Record<Region, Region[]> = {
  north: ['center'],
  center: ['north', 'tel-aviv', 'jerusalem', 'south'],
  'tel-aviv': ['center'],
  jerusalem: ['center', 'south'],
  south: ['center', 'jerusalem'],
  abroad: [],
}
export function regionsAdjacent(a: Region, b: Region): boolean {
  return N[a].includes(b)
}
