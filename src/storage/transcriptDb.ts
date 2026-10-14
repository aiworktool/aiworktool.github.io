import type { SourceMode, TranscriptRecord } from '../transcribe/types';

const DB_NAME = 'local-ai-tools';
const STORE = 'transcripts';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadTranscript(mode: SourceMode): Promise<TranscriptRecord | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).get(mode);
    request.onsuccess = () => {
      const value = request.result as TranscriptRecord | undefined;
      resolve(value && Array.isArray(value.segments) ? value : null);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveTranscript(mode: SourceMode, record: TranscriptRecord): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(record, mode);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
