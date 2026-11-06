// Safety check and change summary for an automatic pool update
// (scripts/check-pool.ts, run by .github/workflows/update-pool.yml).
// A new pool.json only goes live when it passes checkPool; otherwise the
// site keeps the pool it already has.

export interface PoolArtist {
  id: string
  nameHe: string
  popularityRank: number
  metrics?: { spotifyListeners?: number }
}

export interface PoolFile {
  generatedAt: string
  artists: PoolArtist[]
}

// Fewer artists than this = the build broke (Spotify blocked, Wikidata down).
export const MIN_SAFE_POOL = 300
// More than this share of the live pool replaced in one update = suspicious.
export const MAX_SAFE_CHANGE = 0.3
// A rank move of at least this many places is listed in the summary.
export const BIG_MOVE = 20
// The pool is due for a rebuild once it is this old.
export const STALE_AFTER_DAYS = 13

export interface PoolDiff {
  joined: PoolArtist[]
  left: PoolArtist[]
  moved: { artist: PoolArtist; from: number; to: number }[]
  // Share of the previous pool that is no longer in the new one (0..1).
  changedShare: number
}

export function poolAgeDays(generatedAt: string, now = Date.now()): number {
  const t = Date.parse(generatedAt)
  return Number.isFinite(t) ? (now - t) / 86_400_000 : Number.POSITIVE_INFINITY
}

export function isStale(pool: PoolFile | null, now = Date.now()): boolean {
  return pool == null || poolAgeDays(pool.generatedAt, now) >= STALE_AFTER_DAYS
}

export function diffPools(prev: PoolFile, next: PoolFile): PoolDiff {
  const before = new Map(prev.artists.map((a) => [a.id, a]))
  const after = new Map(next.artists.map((a) => [a.id, a]))
  const joined = next.artists.filter((a) => !before.has(a.id)).sort((x, y) => x.popularityRank - y.popularityRank)
  const left = prev.artists.filter((a) => !after.has(a.id)).sort((x, y) => x.popularityRank - y.popularityRank)
  const moved = next.artists
    .filter((a) => before.has(a.id))
    .map((a) => ({ artist: a, from: before.get(a.id)!.popularityRank, to: a.popularityRank }))
    .filter((m) => Math.abs(m.from - m.to) >= BIG_MOVE)
    .sort((x, y) => Math.abs(y.from - y.to) - Math.abs(x.from - x.to))
  const changedShare = prev.artists.length > 0 ? left.length / prev.artists.length : 0
  return { joined, left, moved, changedShare }
}

export interface CheckResult {
  ok: boolean
  problems: string[]
  diff: PoolDiff | null
}

// prev = the live pool (null when it couldn't be fetched). force skips only
// the "too much changed" rule, never the size rule.
export function checkPool(prev: PoolFile | null, next: PoolFile, opts: { force?: boolean } = {}): CheckResult {
  const problems: string[] = []
  if (next.artists.length < MIN_SAFE_POOL) {
    problems.push(`only ${next.artists.length} artists (need at least ${MIN_SAFE_POOL})`)
  }
  const diff = prev ? diffPools(prev, next) : null
  if (diff && !opts.force && diff.changedShare > MAX_SAFE_CHANGE) {
    problems.push(
      `${Math.round(diff.changedShare * 100)}% of the live pool would be replaced ` +
        `(limit ${Math.round(MAX_SAFE_CHANGE * 100)}%; run the workflow by hand with "force" if this is expected)`,
    )
  }
  return { ok: problems.length === 0, problems, diff }
}

const fmt = (n?: number) => (n == null ? '?' : n.toLocaleString('en'))

export function summaryMarkdown(result: CheckResult, next: PoolFile): string {
  const lines: string[] = []
  lines.push(result.ok ? '## Pool update: OK, deploying' : '## Pool update: BLOCKED, live site unchanged')
  lines.push('', `${next.artists.length} artists, built ${next.generatedAt}.`)
  for (const p of result.problems) lines.push(`- ${p}`)
  const d = result.diff
  if (!d) {
    lines.push('', 'No live pool to compare with.')
    return lines.join('\n')
  }
  lines.push('', `Changed: ${Math.round(d.changedShare * 100)}% of the live pool.`)
  lines.push('', `### Joined (${d.joined.length})`)
  for (const a of d.joined) lines.push(`- #${a.popularityRank} ${a.nameHe} (${fmt(a.metrics?.spotifyListeners)})`)
  lines.push('', `### Left (${d.left.length})`)
  for (const a of d.left) lines.push(`- was #${a.popularityRank} ${a.nameHe}`)
  lines.push('', `### Moved ${BIG_MOVE}+ places (${d.moved.length})`)
  for (const m of d.moved) lines.push(`- ${m.artist.nameHe}: #${m.from} → #${m.to}`)
  return lines.join('\n')
}
