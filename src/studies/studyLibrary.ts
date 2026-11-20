import { validateSnapshot, type StudySnapshot } from "./studyWorkflow";
export type StudyIndex = Pick<StudySnapshot, "id" | "savedAt"> & {
  label: string;
  latitude: number;
  longitude: number;
  completed: boolean;
};
async function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("solarpv-independent-studies", 1);
    req.onupgradeneeded = () =>
      req.result.createObjectStore("studies", { keyPath: "id" });
    req.onerror = () =>
      reject(req.error ?? new Error("Study storage unavailable"));
    let blocked = false;
    req.onblocked = () => {
      blocked = true;
      reject(new Error("Close other application tabs to open study storage"));
    };
    req.onsuccess = () => {
      if (blocked) {
        req.result.close();
        return;
      }
      req.result.onversionchange = () => req.result.close();
      resolve(req.result);
    };
  });
}
async function transaction<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore, done: (value: T) => void) => void,
): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("studies", mode);
    let value: T;
    tx.oncomplete = () => {
      db.close();
      resolve(value);
    };
    tx.onabort = () => {
      db.close();
      reject(
        tx.error ??
          new Error("Study transaction aborted (storage quota or permission)"),
      );
    };
    tx.onerror = () => {
      /* abort supplies final transaction failure */
    };
    try {
      action(tx.objectStore("studies"), (v) => {
        value = v;
      });
    } catch (error) {
      tx.abort();
      db.close();
      reject(error);
    }
  });
}
export async function saveStudy(snapshot: StudySnapshot) {
  const checked = validateSnapshot(snapshot);
  if (
    new TextEncoder().encode(JSON.stringify(checked)).length >
    24 * 1024 * 1024
  )
    throw new Error("Study archive exceeds 24 MiB");
  await transaction<void>("readwrite", (store, done) => {
    store.put(checked);
    done();
  });
}
export async function loadStudy(id: string) {
  return transaction<StudySnapshot>("readonly", (store, done) => {
    const req = store.get(id);
    req.onsuccess = () => {
      try {
        done(validateSnapshot(req.result));
      } catch {
        req.transaction?.abort();
      }
    };
  });
}
export async function deleteStudy(id: string) {
  await transaction<void>("readwrite", (store, done) => {
    store.delete(id);
    done();
  });
}
export async function listStudies() {
  return transaction<StudyIndex[]>("readonly", (store, done) => {
    const rows: StudyIndex[] = [];
    const cursor = store.openCursor();
    cursor.onsuccess = () => {
      const item = cursor.result;
      if (!item) {
        done(rows.sort((a, b) => b.savedAt.localeCompare(a.savedAt)));
        return;
      }
      const s = item.value as StudySnapshot;
      rows.push({
        id: s.id,
        savedAt: s.savedAt,
        label: s.request.label,
        latitude: s.request.site.latitude,
        longitude: s.request.site.longitude,
        completed: s.result !== null,
      });
      item.continue();
    };
  });
}
