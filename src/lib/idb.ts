// IndexedDB-backed persistence for the Wikidata-fetched dataset.
//
// Nothing is committed to the repository; this is the only copy of the artist
// pool that exists. It doubles as the offline cache: once a player has loaded
// the app, a stale pool keeps the game fully playable with no network.

const DB_NAME = 'amandle'
const DB_VERSION = 1
const STORE = 'dataset'

export interface DatasetRecord<T> {
  key: string
  ts: number
  data: T
}

function hasIndexedDb(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null
  } catch {
    return false
  }
}

function openDb(): Promise<IDBDatabase | null> {
  if (!hasIndexedDb()) return Promise.resolve(null)
  return new Promise((resolve) => {
    let req: IDBOpenDBRequest
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION)
    } catch {
      resolve(null)
      return
    }
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'key' })
    }
    req.onsuccess = () => resolve(req.result)
    // Private-browsing modes and blocked-storage settings reject the open.
    req.onerror = () => resolve(null)
    req.onblocked = () => resolve(null)
  })
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'))
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'))
  })
}

export async function idbRead<T>(key: string): Promise<DatasetRecord<T> | null> {
  const db = await openDb()
  if (!db) return null
  try {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(key) as IDBRequest<DatasetRecord<T> | undefined>
    const value = await new Promise<DatasetRecord<T> | undefined>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error ?? new Error('IndexedDB read failed'))
    })
    return value ?? null
  } catch {
    return null
  } finally {
    db.close()
  }
}

export async function idbWrite<T>(key: string, ts: number, data: T): Promise<void> {
  const db = await openDb()
  if (!db) return
  try {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put({ key, ts, data } satisfies DatasetRecord<T>)
    await txDone(tx)
  } catch {
    // Storage full or blocked — the in-memory copy still serves this session.
  } finally {
    db.close()
  }
}

export async function idbDelete(key: string): Promise<void> {
  const db = await openDb()
  if (!db) return
  try {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(key)
    await txDone(tx)
  } catch {
    // ignore
  } finally {
    db.close()
  }
}
// Deletes the whole cache database (used by "delete my data" in settings).
export function idbDeleteAll(): Promise<void> {
  if (!hasIndexedDb()) return Promise.resolve()
  return new Promise((resolve) => {
    try {
      const req = indexedDB.deleteDatabase(DB_NAME)
      req.onsuccess = () => resolve()
      req.onerror = () => resolve()
      req.onblocked = () => resolve()
    } catch {
      resolve()
    }
  })
}
