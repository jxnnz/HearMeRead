/**
 * audioCache.js
 * High-performance client-side audio caching using IndexedDB.
 * Allows instant local playback for newly recorded assessments and caches
 * remotely fetched R2 audios so users don't have to wait for slow R2 downloads.
 */

const DB_NAME = "hmr_audio_cache";
const DB_VERSION = 1;
const STORE_NAME = "recordings";

let dbPromise = null;

function getDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return resolve(null);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "key" });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => {
      console.warn("Failed to open audio IndexedDB:", e);
      resolve(null);
    };
  });

  return dbPromise;
}

/**
 * Extract a normalized cache key from a session audio URL or path.
 * e.g. "https://api.domain.com/sessions/155/audio?part=task2&token=..." -> "session_155_task2"
 */
export function extractSessionAudioKey(src) {
  if (!src || typeof src !== "string") return null;

  try {
    // Handle both relative and absolute URLs
    const url = src.startsWith("http") ? new URL(src) : new URL(src, "https://dummy.local");
    const match = url.pathname.match(/\/sessions\/(\d+)\/audio/i);
    if (match) {
      const sessionId = match[1];
      const part = (url.searchParams.get("part") || "2").toLowerCase();
      return `session_${sessionId}_${part}`;
    }
  } catch (err) {
    // Fallback if parsing fails
  }

  return null;
}

/**
 * Save an audio Blob or File directly to IndexedDB.
 */
export async function saveAudioToCache(key, blobOrFile) {
  if (!key || !blobOrFile) return;

  try {
    const db = await getDB();
    if (!db) return;

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);

      const record = {
        key: String(key).toLowerCase(),
        blob: blobOrFile,
        size: blobOrFile.size || 0,
        type: blobOrFile.type || "audio/webm",
        timestamp: Date.now(),
      };

      const req = store.put(record);
      req.onsuccess = () => resolve(true);
      req.onerror = (err) => {
        console.warn(`Failed to cache audio for key ${key}:`, err);
        resolve(false);
      };
    });
  } catch (err) {
    console.warn("saveAudioToCache error:", err);
  }
}

/**
 * Retrieve an audio Blob from IndexedDB by key.
 */
export async function getAudioFromCache(key) {
  if (!key) return null;

  try {
    const db = await getDB();
    if (!db) return null;

    const baseKey = String(key).toLowerCase();
    // Build candidate keys to cover both naming styles
    // (e.g. session_12_2 vs session_12_part2, session_12_1 vs session_12_part1, session_12_task2 vs session_12_part1_task2)
    const candidateKeys = [baseKey];
    if (baseKey.endsWith("_2")) {
      candidateKeys.push(baseKey.replace(/_2$/, "_part2"));
    } else if (baseKey.endsWith("_part2")) {
      candidateKeys.push(baseKey.replace(/_part2$/, "_2"));
    } else if (baseKey.endsWith("_1")) {
      candidateKeys.push(baseKey.replace(/_1$/, "_part1"));
    } else if (baseKey.endsWith("_part1")) {
      candidateKeys.push(baseKey.replace(/_part1$/, "_1"));
    } else if (baseKey.endsWith("_task2")) {
      candidateKeys.push(baseKey.replace(/_task2$/, "_part1_task2"));
    } else if (baseKey.endsWith("_part1_task2")) {
      candidateKeys.push(baseKey.replace(/_part1_task2$/, "_task2"));
    }

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);

      let found = false;
      let checked = 0;

      candidateKeys.forEach((k) => {
        const req = store.get(k);
        req.onsuccess = () => {
          checked++;
          if (!found && req.result?.blob) {
            found = true;
            resolve(req.result.blob);
          } else if (checked === candidateKeys.length && !found) {
            resolve(null);
          }
        };
        req.onerror = () => {
          checked++;
          if (checked === candidateKeys.length && !found) {
            resolve(null);
          }
        };
      });
    });
  } catch (err) {
    console.warn("getAudioFromCache error:", err);
    return null;
  }
}

/**
 * Fetch remote audio in the background and cache it locally for future instant loads.
 */
export async function cacheAudioFromUrl(url, key) {
  if (!url || !key) return null;

  // Don't fetch blob: or data: URLs
  if (url.startsWith("blob:") || url.startsWith("data:")) return null;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const blob = await res.blob();
    if (blob && blob.size > 0) {
      await saveAudioToCache(key, blob);
      return blob;
    }
  } catch (err) {
    // Background fetch failure is non-fatal
    console.debug(`Background audio caching skipped for ${key}:`, err.message);
  }

  return null;
}

/**
 * Clean up recordings older than maxAgeDays or if count exceeds maxItems (LRU).
 */
export async function cleanOldAudioCache(maxAgeDays = 30, maxItems = 100) {
  try {
    const db = await getDB();
    if (!db) return;

    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("timestamp");

    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
    const req = index.openCursor();

    let count = 0;
    const toDelete = [];

    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        count++;
        if (cursor.value.timestamp < cutoff || count > maxItems) {
          toDelete.push(cursor.value.key);
        }
        cursor.continue();
      } else {
        toDelete.forEach((k) => store.delete(k));
      }
    };
  } catch (err) {
    // Non-fatal
  }
}
