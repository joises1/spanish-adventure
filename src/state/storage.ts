export type StorageLike = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

export type StorageErrorCode =
  | "unavailable"
  | "quota"
  | "security"
  | "unknown";

export type StorageFailure = {
  code: StorageErrorCode;
  message: string;
};

export type StorageResult<T> =
  | { ok: true; value: T; changed?: boolean }
  | { ok: false; error: StorageFailure };

const classifyStorageError = (error: unknown): StorageFailure => {
  const name = error instanceof Error ? error.name : "";
  const message =
    error instanceof Error ? error.message : "Browser storage failed";

  if (
    name === "QuotaExceededError" ||
    name === "NS_ERROR_DOM_QUOTA_REACHED"
  ) {
    return { code: "quota", message };
  }
  if (name === "SecurityError") {
    return { code: "security", message };
  }
  return { code: "unknown", message };
};

export class SafeStorage {
  private readonly storage: StorageLike | null;

  constructor(storage: StorageLike | null) {
    this.storage = storage;
  }

  get available() {
    return Boolean(this.storage);
  }

  read(key: string): StorageResult<string | null> {
    if (!this.storage) {
      return {
        ok: false,
        error: {
          code: "unavailable",
          message: "Browser storage is unavailable",
        },
      };
    }
    try {
      return { ok: true, value: this.storage.getItem(key) };
    } catch (error) {
      return { ok: false, error: classifyStorageError(error) };
    }
  }

  write(key: string, value: string): StorageResult<undefined> {
    if (!this.storage) {
      return {
        ok: false,
        error: {
          code: "unavailable",
          message: "Browser storage is unavailable",
        },
      };
    }
    const current = this.read(key);
    if (!current.ok) return { ok: false, error: current.error };
    if (current.value === value) {
      return { ok: true, value: undefined, changed: false };
    }
    try {
      this.storage.setItem(key, value);
      return { ok: true, value: undefined, changed: true };
    } catch (error) {
      return { ok: false, error: classifyStorageError(error) };
    }
  }

  remove(key: string): StorageResult<undefined> {
    if (!this.storage) {
      return {
        ok: false,
        error: {
          code: "unavailable",
          message: "Browser storage is unavailable",
        },
      };
    }
    try {
      this.storage.removeItem(key);
      return { ok: true, value: undefined, changed: true };
    } catch (error) {
      return { ok: false, error: classifyStorageError(error) };
    }
  }

  writeBatch(entries: readonly [string, string][]): StorageResult<undefined> {
    const previousValues = new Map<string, string | null>();
    for (const [key] of entries) {
      const previous = this.read(key);
      if (!previous.ok) return { ok: false, error: previous.error };
      previousValues.set(key, previous.value);
    }

    const changedKeys: string[] = [];
    for (const [key, value] of entries) {
      const result = this.write(key, value);
      if (!result.ok) {
        for (const changedKey of changedKeys.reverse()) {
          const previousValue = previousValues.get(changedKey);
          try {
            if (previousValue === null || previousValue === undefined) {
              this.storage?.removeItem(changedKey);
            } else {
              this.storage?.setItem(changedKey, previousValue);
            }
          } catch {
            // The original failure is the actionable result.
          }
        }
        return result;
      }
      if (result.changed) changedKeys.push(key);
    }

    return {
      ok: true,
      value: undefined,
      changed: changedKeys.length > 0,
    };
  }
}

export const createBrowserStorage = () => {
  try {
    return new SafeStorage(globalThis.localStorage ?? null);
  } catch {
    return new SafeStorage(null);
  }
};

export const browserStorage = createBrowserStorage();
