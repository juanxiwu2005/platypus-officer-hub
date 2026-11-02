const DB = "platypus.docs", STORE = "docs";
const open = () => new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined")
        return reject(new Error("no indexedDB"));
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE, { keyPath: "id" }); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
});
async function run(mode, fn) {
    try {
        const db = await open();
        return await new Promise((resolve) => {
            const tx = db.transaction(STORE, mode), req = fn(tx.objectStore(STORE));
            req.onsuccess = () => resolve(req.result ?? null);
            req.onerror = () => resolve(null);
            tx.oncomplete = () => db.close();
        });
    }
    catch {
        return null;
    }
}
/** Small JSON records in the same browser database (an unfinished setup, for example). */
export const saveJson = async (id, value) => (await run("readwrite", s => s.put({ id, kind: "json", savedAt: new Date().toISOString(), value }))) !== null;
export const loadJson = async (id) => { const r = await run("readonly", s => s.get(id)); return r ? { savedAt: r.savedAt, value: r.value } : null; };
export const deleteJson = (id) => run("readwrite", s => s.delete(id));
export const saveLocalDoc = async (doc) => (await run("readwrite", s => s.put(doc))) !== null;
export const loadLocalDoc = (id = "constitution") => run("readonly", s => s.get(id));
export const clearLocalDocs = () => run("readwrite", s => s.clear());
export async function checksum(text) {
    try {
        const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
        return [...new Uint8Array(bytes)].map(n => n.toString(16).padStart(2, "0")).join("");
    }
    catch {
        return "";
    }
}
