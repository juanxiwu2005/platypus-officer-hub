/**
 * A small browser database (IndexedDB) for text read from documents during setup, such as the club constitution.
 * It lives only in this browser; Phase 3 keeps it that way and a later version moves it to the server.
 * Every call fails quietly (private windows, blocked storage, tests): setup works without it.
 */
export interface LocalDoc { id: string; kind: "constitution"; fileName: string; text: string; checksum: string; savedAt: string }

const DB = "platypus.docs", STORE = "docs"
const open = () => new Promise<IDBDatabase>((resolve, reject) => {
  if (typeof indexedDB === "undefined") return reject(new Error("no indexedDB"))
  const req = indexedDB.open(DB, 1)
  req.onupgradeneeded = () => { req.result.createObjectStore(STORE, { keyPath: "id" }) }
  req.onsuccess = () => resolve(req.result)
  req.onerror = () => reject(req.error)
})
async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  try {
    const db = await open()
    return await new Promise<T | null>((resolve) => {
      const tx = db.transaction(STORE, mode), req = fn(tx.objectStore(STORE))
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => resolve(null)
      tx.oncomplete = () => db.close()
    })
  } catch { return null }
}

/** Small JSON records in the same browser database (an unfinished setup, for example). */
export const saveJson = async (id: string, value: unknown) => (await run("readwrite", s => s.put({ id, kind: "json", savedAt: new Date().toISOString(), value }))) !== null
export const loadJson = async <T,>(id: string): Promise<{ savedAt: string; value: T } | null> => { const r = await run<{ savedAt: string; value: T }>("readonly", s => s.get(id)); return r ? { savedAt: r.savedAt, value: r.value } : null }
/** Replace an explicitly restored setup only after its previous copy and the new draft commit together. */
export async function saveJsonWithBackup(id: string, value: unknown): Promise<boolean> {
  try {
    const db = await open()
    return await new Promise<boolean>(resolve => {
      const tx = db.transaction(STORE, "readwrite"), store = tx.objectStore(STORE)
      const old = store.get(id)
      old.onsuccess = () => {
        try {
          if (old.result) store.put({ ...old.result, id: `${id}-backup-${crypto.randomUUID()}` })
          store.put({ id, kind: "json", savedAt: new Date().toISOString(), value })
        } catch { tx.abort() }
      }
      tx.oncomplete = () => { db.close(); resolve(true) }
      tx.onabort = tx.onerror = () => { db.close(); resolve(false) }
    })
  } catch { return false }
}
export const deleteJson = (id: string) => run("readwrite", s => s.delete(id))

export const saveLocalDoc = async (doc: LocalDoc) => (await run("readwrite", s => s.put(doc))) !== null
export const loadLocalDoc = (id = "constitution") => run<LocalDoc>("readonly", s => s.get(id))
export const clearLocalDocs = () => run("readwrite", s => s.clear())

export async function checksum(text: string): Promise<string> {
  try {
    const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
    return [...new Uint8Array(bytes)].map(n => n.toString(16).padStart(2, "0")).join("")
  } catch { return "" }
}
