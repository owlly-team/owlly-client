import test from "node:test";
import assert from "node:assert/strict";
import { createPartyCache, partyCacheKey } from "./partyCache.js";

const response = (status = "CONFIRMING", etag = '"v1"') => ({
  data: { id: "401", myMemberId: "501", status },
  etag,
});
function setup() {
  let now = 1000;
  const cache = createPartyCache({ now: () => now });
  cache.activate("101");
  return {
    cache,
    advance: (ms) => {
      now += ms;
    },
  };
}
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const entry = (cache, userId = "101", partyId = "401") =>
  cache.store.getState().entries[partyCacheKey(userId, partyId)];

test("home, matching and room reuse the same fresh party and ETag; expired data is fetched again", async () => {
  const { cache, advance } = setup();
  let calls = 0;
  const load = async () => {
    calls += 1;
    return response();
  };
  const home = await cache.load("101", "401", load);
  assert.equal(await cache.load("101", "401", load), home);
  assert.equal(await cache.load("101", "401", load), home);
  assert.equal(calls, 1);
  advance(15000);
  await cache.load("101", "401", load);
  assert.equal(calls, 2);
});

test("concurrent consumers share one request and leaving one screen does not cancel the other", async () => {
  const { cache } = setup();
  const gate = deferred();
  const controller = new AbortController();
  let calls = 0;
  let sharedSignal;
  const loader = (signal) => {
    calls += 1;
    sharedSignal = signal;
    return gate.promise;
  };
  const first = cache.load("101", "401", loader, { signal: controller.signal });
  const second = cache.load("101", "401", loader);
  const cancelled = assert.rejects(first, { name: "AbortError" });
  controller.abort();
  gate.resolve(response());
  await cancelled;
  assert.equal((await second).etag, '"v1"');
  assert.equal(calls, 1);
  assert.equal(sharedSignal.aborted, false);
});

test("party IDs are independent and user switches discard cached data", async () => {
  const { cache } = setup();
  await cache.load("101", "401", async () => response());
  assert.equal(entry(cache, "101", "402"), undefined);
  cache.activate("102");
  assert.equal(entry(cache), undefined);
  await assert.rejects(
    cache.load("101", "401", async () => response()),
    { name: "AbortError" },
  );
  await cache.load("102", "401", async () => response("PREPAYING", '"user2"'));
  assert.equal(entry(cache, "102").response.etag, '"user2"');
});

test("logout aborts pending work and late responses cannot repopulate the cache", async () => {
  const { cache } = setup();
  const gate = deferred();
  let signal;
  const pending = cache.load("101", "401", (value) => {
    signal = value;
    return gate.promise;
  });
  await Promise.resolve();
  cache.reset();
  gate.resolve(response());
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(signal.aborted, true);
  assert.deepEqual(cache.store.getState().entries, {});
});

test("confirmation updates all subscribers atomically and late GET cannot restore old data or ETag", async () => {
  const { cache } = setup();
  const gate = deferred();
  const pending = cache.load("101", "401", () => gate.promise);
  const updates = [];
  const unsubscribe = cache.store.subscribe((state) =>
    updates.push(state.entries[partyCacheKey("101", "401")]?.response),
  );
  const token = cache.invalidate("101", "401");
  const accepted = response("PREPAYING", '"v2"');
  cache.commit(token, accepted);
  gate.resolve(response());
  assert.equal(await pending, accepted);
  assert.equal(entry(cache).response, accepted);
  assert.deepEqual(updates.filter(Boolean), [accepted]);
  unsubscribe();
});

test("superseded GET errors cannot remove a successful mutation response", async () => {
  const { cache } = setup();
  const gate = deferred();
  const pending = cache.load("101", "401", () => gate.promise);
  cache.commit(cache.invalidate("101", "401"), response("PREPAYING", '"v2"'));
  gate.reject(Object.assign(new Error("old forbidden"), { status: 403 }));
  assert.equal((await pending).etag, '"v2"');
  assert.equal(entry(cache).error, undefined);
});

test("412 recovery can force a network read despite a fresh cached party", async () => {
  const { cache } = setup();
  await cache.load("101", "401", async () => response());
  let calls = 0;
  await cache.load(
    "101",
    "401",
    async () => {
      calls += 1;
      return response("PREPAYING", '"v2"');
    },
    { force: true },
  );
  assert.equal(calls, 1);
  assert.equal(entry(cache).response.etag, '"v2"');
});

test("access failure removes private data, while transient server errors keep the last successful snapshot", async () => {
  const { cache } = setup();
  await cache.load("101", "401", async () => response());
  await assert.rejects(
    cache.load(
      "101",
      "401",
      async () => {
        throw Object.assign(new Error("server failed"), { status: 500 });
      },
      { force: true },
    ),
  );
  assert.equal(entry(cache).response.etag, '"v1"');
  await assert.rejects(
    cache.load(
      "101",
      "401",
      async () => {
        throw Object.assign(new Error("forbidden"), { status: 403 });
      },
      { force: true },
    ),
  );
  assert.equal(entry(cache).response, undefined);
  assert.equal(entry(cache).error.status, 403);
});

test("a mutation started before logout or a newer mutation cannot publish its response", () => {
  const { cache } = setup();
  const old = cache.invalidate("101", "401");
  const newer = cache.invalidate("101", "401");
  assert.throws(() => cache.commit(old, response()), { name: "AbortError" });
  cache.commit(newer, response("PREPAYING", '"v3"'));
  cache.reset();
  cache.activate("101");
  assert.throws(() => cache.commit(newer, response()), { name: "AbortError" });
  assert.equal(entry(cache), undefined);
});
