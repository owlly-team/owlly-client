import test from "node:test";
import assert from "node:assert/strict";
import { createRideRequestIndex } from "./rideRequestIndex.js";

function setup() {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const index = createRideRequestIndex(() => storage);
  index.activate("101");
  return { index, values, storage };
}
const request = {
  id: "301",
  journeyId: "201",
  createdAt: "2026-11-14T23:00:00+09:00",
  dropoff: { latitude: 1, longitude: 2 },
  sameGenderOnly: true,
  status: "FAILED",
};

test("refresh restores request IDs without retaining coordinates, gender or result payloads", () => {
  const { index, values, storage } = setup();
  index.remember("101", request);
  const saved = [...values.values()][0];
  for (const value of ["dropoff", "latitude", "sameGenderOnly", "FAILED"])
    assert.equal(saved.includes(value), false);
  const refreshed = createRideRequestIndex(() => storage);
  refreshed.activate("101");
  assert.deepEqual(refreshed.list("101"), [
    { requestId: "301", journeyId: "201", createdAt: request.createdAt },
  ]);
  assert.deepEqual(refreshed.list("102"), []);
});

test("account changes and logout prevent old request IDs from being restored", () => {
  const { index, storage } = setup();
  index.remember("101", request);
  index.activate("102");
  index.remember("101", request);
  assert.deepEqual(index.list("102"), []);
  index.clear();
  const refreshed = createRideRequestIndex(() => storage);
  refreshed.activate("101");
  assert.deepEqual(refreshed.list("101"), []);
});

test("late polling of an older request cannot replace the new registration", () => {
  const { index } = setup();
  index.remember("101", request);
  const newer = {
    ...request,
    id: "302",
    createdAt: "2026-11-14T23:10:00+09:00",
  };
  index.remember("101", newer, true);
  index.remember("101", request);
  assert.equal(index.list("101")[0].requestId, "302");
});

test("unavailable storage and malformed entries do not block registration", () => {
  const index = createRideRequestIndex(() => {
    throw new Error("blocked");
  });
  index.activate("101");
  index.remember("101", request);
  index.remember("101", { id: "bad", journeyId: "201" });
  assert.equal(index.list("101").length, 1);
  index.clear();
});
