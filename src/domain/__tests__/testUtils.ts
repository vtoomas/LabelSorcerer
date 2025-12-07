import type { Config } from "../storageService";

const STORAGE_KEY = "labelsorcerer:config";
let store: Record<string, unknown> = {};

function createChromeMock() {
  const runtime = { lastError: null };

  const sync = {
    get(key: string | string[], callback: (items: Record<string, unknown>) => void) {
      const keyName = typeof key === "string" ? key : STORAGE_KEY;
      Promise.resolve().then(() => {
        runtime.lastError = null;
        callback({ [keyName]: store[keyName] });
      });
    },
    set(items: Record<string, unknown>, callback?: () => void) {
      Promise.resolve().then(() => {
        runtime.lastError = null;
        Object.assign(store, items);
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
  store = { ...(initial ?? {}) };
  const chromeMock = createChromeMock();
  (globalThis as any).chrome = chromeMock;
}

export function getStoredConfig(): Config | undefined {
  return store[STORAGE_KEY] as Config | undefined;
}
