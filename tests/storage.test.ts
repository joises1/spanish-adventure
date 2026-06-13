import assert from "node:assert/strict";
import test from "node:test";
import {
  SafeStorage,
  type StorageLike,
} from "../src/state/storage.ts";

class CountingStorage implements StorageLike {
  values = new Map<string, string>();
  writes = 0;
  errorName: string | null = null;
  failOnKey: string | null = null;

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    if (this.errorName && (!this.failOnKey || this.failOnKey === key)) {
      const error = new Error("storage write failed");
      error.name = this.errorName;
      throw error;
    }
    this.writes += 1;
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

test("localStorage unavailable returns typed failures without throwing", () => {
  const storage = new SafeStorage(null);

  assert.deepEqual(storage.read("progress"), {
    ok: false,
    error: {
      code: "unavailable",
      message: "Browser storage is unavailable",
    },
  });
  assert.equal(storage.write("progress", "{}").ok, false);
  assert.equal(storage.remove("progress").ok, false);
});

test("storage quota errors are classified and returned safely", () => {
  const memory = new CountingStorage();
  memory.errorName = "QuotaExceededError";
  const result = new SafeStorage(memory).write("progress", "{}");

  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, "quota");
});

test("unchanged values do not cause repeated storage writes", () => {
  const memory = new CountingStorage();
  const storage = new SafeStorage(memory);

  assert.equal(storage.write("progress", "{}").ok, true);
  const unchanged = storage.write("progress", "{}");

  assert.equal(unchanged.ok, true);
  assert.equal(unchanged.ok && unchanged.changed, false);
  assert.equal(memory.writes, 1);
});

test("a failed batch write rolls earlier course writes back", () => {
  const memory = new CountingStorage();
  const storage = new SafeStorage(memory);
  storage.write("a1-a2", "old beginner");
  storage.write("b1", "old intermediate");
  memory.errorName = "QuotaExceededError";
  memory.failOnKey = "b1";

  const result = storage.writeBatch([
    ["a1-a2", "new beginner"],
    ["b1", "new intermediate"],
  ]);

  assert.equal(result.ok, false);
  assert.equal(memory.getItem("a1-a2"), "old beginner");
  assert.equal(memory.getItem("b1"), "old intermediate");
});
