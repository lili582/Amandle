import { describe, expect, it } from 'vitest'
import { parsePoint, regionFromPoint, regionsAdjacent } from '../src/lib/region'

const at = (lon: number, lat: number, c = 'Q801') => regionFromPoint({ lat, lon }, c)

describe('region from coordinates', () => {
  it('parses WKT points', () => {
    expect(parsePoint('Point(34.78 32.08)')).toEqual({ lon: 34.78, lat: 32.08 })
    expect(parsePoint('nope')).toBeNull()
    expect(parsePoint(undefined)).toBeNull()
  })

  it('places Israeli cities in the right region', () => {
    expect(at(34.78, 32.08)).toBe('tel-aviv') // Tel Aviv
    expect(at(34.8, 31.97)).toBe('tel-aviv') // Rishon LeZion
    expect(at(35.21, 31.77)).toBe('jerusalem')
    expect(at(34.99, 32.79)).toBe('north') // Haifa
    expect(at(35.5, 32.8)).toBe('north') // Tiberias
    expect(at(34.79, 31.25)).toBe('south') // Beersheba
    expect(at(34.95, 29.56)).toBe('south') // Eilat
    expect(at(34.86, 32.33)).toBe('center') // Netanya
    expect(at(34.65, 31.8)).toBe('center') // Ashdod
  })

  it('anything outside Israel is abroad', () => {
    expect(at(-73.99, 40.73, 'Q30')).toBe('abroad') // New York
    expect(at(44.36, 33.31, 'Q796')).toBe('abroad') // Baghdad
    expect(regionFromPoint(null)).toBeUndefined()
  })

  it('neighbours are symmetric enough for the yellow tile', () => {
    expect(regionsAdjacent('center', 'tel-aviv')).toBe(true)
    expect(regionsAdjacent('tel-aviv', 'center')).toBe(true)
    expect(regionsAdjacent('north', 'south')).toBe(false)
    expect(regionsAdjacent('abroad', 'center')).toBe(false)
  })
})
