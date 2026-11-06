import { describe, it, expect, vi } from 'vitest'
import { crawlCategories, fetchCategoryCandidates, genreFromCategories } from '../../src/sources/hewikiCategories'

// A tiny fake of the MediaWiki API: categorymembers and pageprops|categories.
function fakeWiki(tree: Record<string, string[]>, pages: Record<string, { qid?: string; cats?: string[] }>) {
  return vi.fn(async (url: string) => {
    const p = new URL(url).searchParams
    let body: unknown
    if (p.get('list') === 'categorymembers') {
      const name = p.get('cmtitle')!.replace('קטגוריה:', '')
      body = {
        query: {
          categorymembers: (tree[name] ?? []).map((t) =>
            t.startsWith('קטגוריה:') ? { ns: 14, title: t } : { ns: 0, title: t },
          ),
        },
      }
    } else {
      body = {
        query: {
          pages: p
            .get('titles')!
            .split('|')
            .map((t) => ({
              title: t,
              pageprops: pages[t]?.qid ? { wikibase_item: pages[t].qid } : undefined,
              categories: (pages[t]?.cats ?? []).map((c) => ({ title: 'קטגוריה:' + c })),
            })),
        },
      }
    }
    return { ok: true, json: async () => body } as Response
  })
}

describe('genreFromCategories', () => {
  it('maps Hebrew category names, most specific first', () => {
    expect(genreFromCategories(['זמרי פופ ישראלים', 'זמרי מוזיקה מזרחית ישראלים'])).toBe('mizrahi')
    expect(genreFromCategories(['להקות רוק ישראליות'])).toBe('rock')
    expect(genreFromCategories(['להקות רוק אלטרנטיבי ישראליות'])).toBe('indie-alt')
    expect(genreFromCategories(['להקות היפ הופ ישראליות'])).toBe('hiphop')
    expect(genreFromCategories(['ישראלים שנולדו ב-1981'])).toBeUndefined()
  })
})

describe('crawlCategories', () => {
  it('follows genre subcategories but not per-artist or member categories', async () => {
    const fetchImpl = fakeWiki(
      {
        'להקות ישראליות לפי סגנון': ['קטגוריה:להקות רוק ישראליות'],
        'להקות רוק ישראליות': ['איפה הילד?', 'כוורת', 'קטגוריה:כוורת', 'קטגוריה:חברי להקות רוק ישראליות'],
        כוורת: ['גור הכלב'],
        'חברי להקות רוק ישראליות': ['דני סנדרסון'],
      },
      {},
    )
    const pages = await crawlCategories(['להקות ישראליות לפי סגנון'], /^להקות/, { fetchImpl })
    expect([...pages].sort()).toEqual(['איפה הילד?', 'כוורת'])
  })
})

describe('fetchCategoryCandidates', () => {
  it('returns singers and groups by QID with a genre hint', async () => {
    const fetchImpl = fakeWiki(
      {
        'זמרים השרים בעברית': ['יוני בלוך', 'קטגוריה:אריק איינשטיין'],
        'אריק איינשטיין': ['אוהב להיות בבית'],
        'להקות ישראליות': ['טיפקס (להקה)'],
      },
      {
        'יוני בלוך': { qid: 'Q1986182', cats: ['זמרי רוק ישראלים', 'זמרי פופ ישראלים'] },
        'טיפקס (להקה)': { qid: 'Q597761', cats: ['להקות פופ ישראליות', 'להקות אתניות ישראליות'] },
      },
    )
    const out = await fetchCategoryCandidates({ fetchImpl })
    expect(out.get('Q1986182')).toEqual({ qid: 'Q1986182', title: 'יוני בלוך', kind: 'singer', genreHint: 'rock' })
    expect(out.get('Q597761')).toMatchObject({ kind: 'group', genreHint: 'ethnic-world' })
    expect(out.size).toBe(2)
  })
})

describe('genreFromCategories ignores non-music categories', () => {
  it('does not read "rock" out of מרוקאי or "hasidic" out of a festival', () => {
    expect(genreFromCategories(['אישים ממוצא יהודי-מרוקאי', 'זמרות פופ ישראליות'])).toBe('pop')
    expect(genreFromCategories(['משתתפי פסטיבל הזמר החסידי', 'זמרי רוק ישראלים'])).toBe('rock')
  })
})
