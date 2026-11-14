import test from "node:test";
import assert from "node:assert/strict";
import {
  loadHomeComparison,
  mergeHomeComparison,
} from "./loadHomeComparison.js";

const deferred = () => {
  let resolve;
  const promise = new Promise((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
};
const context = {
  profile: {
    user: { universityId: "1" },
    defaultDropoff: { latitude: 37.33, longitude: 127.27 },
    sameGenderDefault: true,
  },
  pickupPoint: { id: "11" },
  now: new Date("2026-11-15T23:00:00+09:00"),
};
const travel = {
  destinationDongId: "31",
  soloTaxiEstimatedWon: 0,
  transit: { available: false },
};

test("refresh keeps valid waiting rows while loading without mixing another destination or condition", () => {
  const previous = {
    ...context,
    travelOptions: travel,
    matchingSlots: [
      { departureAt: "2026-11-16T00:00:00+09:00", waitingCount: 2 },
    ],
  };
  const next = { ...previous, matchingSlots: [], slotsLoading: true };
  assert.equal(
    mergeHomeComparison(previous, next, context.now.getTime()).matchingSlots[0]
      .waitingCount,
    2,
  );
  assert.deepEqual(
    mergeHomeComparison(previous, {
      ...next,
      profile: { ...next.profile, sameGenderDefault: false },
    }).matchingSlots,
    [],
  );
  assert.deepEqual(
    mergeHomeComparison(previous, {
      ...next,
      travelOptions: { destinationDongId: "other" },
    }).matchingSlots,
    [],
  );
  assert.deepEqual(
    mergeHomeComparison(previous, { ...next, slotsLoading: false })
      .matchingSlots,
    [],
  );
});

test("home publishes real transport before slow slots, then fills waiting data separately", async () => {
  const slots = deferred(),
    first = deferred();
  const updates = [];
  const done = loadHomeComparison(
    {
      travelOptions: async () => ({ data: travel }),
      slots: () => slots.promise,
    },
    context,
    (data) => {
      updates.push(data);
      first.resolve();
    },
  );
  await first.promise;
  assert.equal(updates.length, 1);
  assert.equal(updates[0].travelOptions.soloTaxiEstimatedWon, 0);
  assert.equal(updates[0].slotsLoading, true);
  assert.deepEqual(updates[0].matchingSlots, []);
  slots.resolve({
    data: [{ departureAt: "2026-11-16T00:00:00+09:00", waitingCount: 2 }],
  });
  await done;
  assert.equal(updates.at(-1).slotsLoading, false);
  assert.equal(updates.at(-1).matchingSlots[0].waitingCount, 2);
});

test("slot failure retains transport but cannot fabricate waiting counts, and cancellation suppresses late updates", async () => {
  const updates = [];
  await loadHomeComparison(
    {
      travelOptions: async () => ({ data: travel }),
      slots: async () => {
        throw new Error("offline");
      },
    },
    context,
    (data) => updates.push(data),
  );
  assert.equal(updates.at(-1).travelOptions.soloTaxiEstimatedWon, 0);
  assert.equal(updates.at(-1).slotsLoading, false);
  assert.ok(updates.at(-1).slotsError);
  assert.deepEqual(updates.at(-1).matchingSlots, []);
  const controller = new AbortController(),
    slots = deferred(),
    first = deferred();
  const late = [];
  const done = loadHomeComparison(
    {
      travelOptions: async () => ({ data: travel }),
      slots: () => slots.promise,
    },
    { ...context, signal: controller.signal },
    (data) => {
      late.push(data);
      first.resolve();
    },
  );
  await first.promise;
  controller.abort();
  slots.resolve({ data: [] });
  await done;
  assert.equal(late.length, 1);
});

test("authorization errors still reject instead of becoming optional slot warnings", async () => {
  await assert.rejects(
    loadHomeComparison(
      {
        travelOptions: async () => ({ data: travel }),
        slots: async () => {
          throw Object.assign(new Error("denied"), { status: 403 });
        },
      },
      context,
      () => {},
    ),
    { status: 403 },
  );
});
