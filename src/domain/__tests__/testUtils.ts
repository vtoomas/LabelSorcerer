import type { Config } from "../storageService";
import { LEGACY_STORAGE_KEY } from "../storageService";

let store: Record<string, unknown> = {};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function resolveKeys(key: string | string[] | null | undefined): string[] {
  if (key === null || key === undefined) {
    return Object.keys(store);
  }
  return Array.isArray(key) ? key : [key];
}

function createChromeMock() {
  const runtime = { lastError: null as { message: string } | null };

  const sync = {
    get(key: string | string[] | null, callback: (items: Record<string, unknown>) => void) {
      Promise.resolve().then(() => {
        runtime.lastError = null;
        if (key === null) {
          callback(clone(store));
          return;
        }

        const result: Record<string, unknown> = {};
        for (const entry of resolveKeys(key)) {
          if (entry in store) {
            result[entry] = clone(store[entry]);
          }
        }
        callback(result);
      });
    },
    set(items: Record<string, unknown>, callback?: () => void) {
      Promise.resolve().then(() => {
        runtime.lastError = null;
        Object.assign(store, clone(items));
        callback?.();
      });
    },
    remove(keys: string | string[], callback?: () => void) {
      Promise.resolve().then(() => {
        runtime.lastError = null;
        for (const key of resolveKeys(keys)) {
          delete store[key];
        }
        callback?.();
      });
    }
  };

  return {
    runtime,
    storage: {
      sync
    }
  };
}

export function resetChromeStorage(initial?: Record<string, unknown>) {
  store = clone(initial ?? {});
  const chromeMock = createChromeMock();
  (globalThis as any).chrome = chromeMock;
}

export function getStoredItems(): Record<string, unknown> {
  return clone(store);
}

export function getStoredConfig(): Config | undefined {
  return store[LEGACY_STORAGE_KEY] as Config | undefined;
}
