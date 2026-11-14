import test from "node:test";
import assert from "node:assert/strict";
import { createReferenceCache, referenceTtl } from "./referenceCache.js";

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};

test("reference data reuses response and ETag until expiry and never shares mutable objects", async () => {
  let time = 0,
    calls = 0;
  const cache = createReferenceCache({ now: () => time });
  cache.activate("1", "session");
  const load = () =>
    cache.load(
      "profile",
      async () => ({ data: { version: ++calls }, etag: `v${calls}` }),
      { ttl: 100 },
    );
  const first = await load();
  first.data.version = 99;
  assert.deepEqual(await load(), { data: { version: 1 }, etag: "v1" });
  time = 100;
  assert.equal((await load()).data.version, 2);
  cache.invalidate("profile");
  assert.equal((await load()).data.version, 3);
  assert.equal(referenceTtl("/rooms/601/messages"), null);
  assert.equal(referenceTtl("/parties/401/settlement"), null);
  assert.equal(referenceTtl("/pickup-points?universityId=1"), 60000);
});

test("concurrent consumers share a GET and one page abort cannot cancel another page", async () => {
  const cache = createReferenceCache();
  cache.activate("1");
  const response = deferred();
  let calls = 0,
    requestSignal;
  const loader = async (signal) => {
    calls++;
    requestSignal = signal;
    return response.promise;
  };
  const one = new AbortController();
  const first = cache.load("banks", loader, { signal: one.signal });
  const second = cache.load("banks", loader);
  await Promise.resolve();
  const rejected = assert.rejects(first, { name: "AbortError" });
  one.abort();
  assert.equal(requestSignal.aborted, false);
  response.resolve({ data: ["bank"] });
  await rejected;
  assert.deepEqual(await second, { data: ["bank"] });
  assert.equal(calls, 1);
});

test("aborted StrictMode mount does not poison the next mount or cache late results", async () => {
  const cache = createReferenceCache();
  cache.activate("1");
  const old = deferred();
  const controller = new AbortController();
  const first = cache.load("profile", () => old.promise, {
    signal: controller.signal,
  });
  await Promise.resolve();
  const rejected = assert.rejects(first, { name: "AbortError" });
  controller.abort();
  const fresh = await cache.load("profile", async () => ({ data: "new" }));
  old.resolve({ data: "old" });
  await rejected;
  assert.equal(fresh.data, "new");
  assert.equal(
    (await cache.load("profile", () => assert.fail("cached"))).data,
    "new",
  );
});

test("logout, account and session changes discard old data and pending reads", async () => {
  const cache = createReferenceCache();
  cache.activate("1", "session1");
  const old = deferred();
  const first = cache.load("profile", () => old.promise);
  await Promise.resolve();
  const rejected = assert.rejects(first, { name: "AbortError" });
  cache.activate("2", "session2");
  old.resolve({ data: "user1" });
  await rejected;
  assert.equal(
    (await cache.load("profile", async () => ({ data: "user2" }))).data,
    "user2",
  );
  cache.activate("2", "newSession");
  assert.equal(
    (await cache.load("profile", async () => ({ data: "fresh-session" }))).data,
    "fresh-session",
  );
  cache.reset();
  assert.equal(
    (await cache.load("profile", async () => ({ data: "guest" }))).data,
    "guest",
  );
});

test("failed reads and invalidated in-flight responses cannot be cached", async () => {
  const cache = createReferenceCache();
  cache.activate("1");
  await assert.rejects(
    cache.load("profile", async () => {
      throw new Error("offline");
    }),
  );
  const old = deferred();
  const first = cache.load("profile", () => old.promise);
  await Promise.resolve();
  const rejected = assert.rejects(first, { name: "AbortError" });
  cache.invalidate("profile");
  old.resolve({ data: "before-update" });
  await rejected;
  assert.equal(
    (await cache.load("profile", async () => ({ data: "after-update" }))).data,
    "after-update",
  );
});
