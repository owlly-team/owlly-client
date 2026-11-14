import test from "node:test";
import assert from "node:assert/strict";
import {
  canResolveFailure,
  findMyJourney,
  loadMatchingFailure,
  recordJourneyChoice,
} from "./matchingFailureData.js";

const now = Date.parse("2026-11-14T23:10:00+09:00");
const request = {
  id: "301",
  journeyId: "201",
  pickupPointId: "11",
  destinationDongId: "31",
  districtId: "21",
  districtName: "수지구",
  destinationDongName: "풍덕천1동",
  status: "FAILED",
  departureAt: "2026-11-14T23:30:00+09:00",
  sameGenderOnly: true,
};
const journey = {
  id: "201",
  universityId: "1",
  pickupPointId: "11",
  destinationDongId: "31",
  outcome: "UNRESOLVED",
  activeRequestId: null,
};
const point = { latitude: 37.32, longitude: 127.09 };
const pickupPoint = { id: "11", name: "학교 정문", point };
const slot = (time, registrationAllowed = true, waitingCount = 0) => ({
  departureAt: time,
  registrationAllowed,
  waitingCount,
});
function setup() {
  const queries = [];
  const bodies = [];
  const api = {
    rideRequest: async () => ({ data: request }),
    journeys: async () => ({ data: [journey] }),
    profile: async () => ({
      data: { defaultDongId: "31", defaultDropoff: point },
    }),
    pickupPoints: async () => ({ data: [pickupPoint] }),
    travelOptions: async (body) => {
      bodies.push(body);
      return {
        data: {
          destinationDongId: "31",
          soloTaxiEstimatedWon: 15000,
          transit: { available: false },
        },
      };
    },
    slots: async (query) => {
      queries.push(query);
      return {
        data:
          query.date === "2026-11-14"
            ? [
                slot("2026-11-14T23:30:00+09:00"),
                slot("2026-11-14T23:00:00+09:00"),
                slot("2026-11-14T23:20:00+09:00"),
              ]
            : [
                slot("2026-11-15T00:00:00+09:00", false),
                slot("2026-11-15T00:30:00+09:00", true, 2),
              ],
      };
    },
  };
  return { api, queries, bodies };
}

test("failed result uses real request, exact dropoff and Korean date slots, excluding closed and previous slots", async () => {
  const { api, queries, bodies } = setup();
  const result = await loadMatchingFailure(api, "301", undefined, now);
  assert.equal(result.rideRequest, request);
  assert.equal(result.isPreview, false);
  assert.equal(result.nextSlot.departureAt, "2026-11-15T00:30:00+09:00");
  assert.equal(result.nextSlot.waitingCount, 2);
  assert.deepEqual(
    queries.map((q) => [q.date, q.sameGenderOnly, q.destinationDongId]),
    [
      ["2026-11-14", "true", "31"],
      ["2026-11-15", "true", "31"],
    ],
  );
  assert.deepEqual(bodies, [
    {
      pickupPointId: "11",
      dropoff: point,
      departureAt: new Date(now).toISOString(),
    },
  ]);
  assert.equal(result.selection.journeyId, "201");
});

test("a custom dropoff cannot be replaced by an unrelated profile default", async () => {
  const { api, bodies } = setup();
  api.profile = async () => ({
    data: { defaultDongId: "99", defaultDropoff: point },
  });
  const result = await loadMatchingFailure(api, "301", undefined, now);
  assert.equal(result.needsDestinationSelection, true);
  assert.equal(result.selection.destination.point, undefined);
  assert.equal(result.travelOptions, null);
  assert.equal(bodies.length, 0);
  assert.equal(result.nextSlot.waitingCount, 2);
});

test("the matching request's retained custom pin can be reused without persisting coordinates", async () => {
  const { api, bodies } = setup();
  api.profile = async () => ({
    data: {
      defaultDongId: "99",
      defaultDropoff: { latitude: 0, longitude: 0 },
    },
  });
  const selection = { pickupPoint, destination: { id: "31", point } };
  const result = await loadMatchingFailure(api, "301", selection, now);
  assert.equal(result.needsDestinationSelection, false);
  assert.deepEqual(bodies[0].dropoff, point);
});

test("missing upstream information leaves an actual failure screen without invented fares or routes", async () => {
  const { api } = setup();
  api.travelOptions = async () => {
    throw Object.assign(new Error("upstream"), { status: 503 });
  };
  const result = await loadMatchingFailure(api, "301", undefined, now);
  assert.equal(result.travelOptions, null);
  assert.equal(result.warnings.length, 1);
  assert.equal(result.nextSlot.waitingCount, 2);
});

test("a newly resolved pin in a different dong is not used for the failed request", async () => {
  const { api } = setup();
  api.travelOptions = async () => ({
    data: { destinationDongId: "99", soloTaxiEstimatedWon: 900 },
  });
  const result = await loadMatchingFailure(api, "301", undefined, now);
  assert.equal(result.travelOptions, null);
  assert.ok(result.warnings.length);
});

test("new active requests and already resolved journeys block actions on an old failure", async () => {
  const { api, queries } = setup();
  api.journeys = async () => ({
    data: [{ ...journey, activeRequestId: "302" }],
  });
  const result = await loadMatchingFailure(api, "301", undefined, now);
  assert.equal(canResolveFailure(result), false);
  assert.equal(queries.length, 0);
  assert.equal(
    canResolveFailure({
      rideRequest: request,
      journey: { ...journey, outcome: "SOLO_SELECTED" },
    }),
    false,
  );
});

test("authentication errors are not reduced to optional transport warnings", async () => {
  const { api } = setup();
  api.travelOptions = async () => {
    throw Object.assign(new Error("expired"), { status: 401 });
  };
  await assert.rejects(loadMatchingFailure(api, "301", undefined, now), {
    status: 401,
  });
});

test("journey lookup reads further pages and rejects repeated cursors", async () => {
  const api = {
    journeys: async (cursor) =>
      cursor
        ? { data: [journey] }
        : { data: [], meta: { hasMore: true, nextCursor: "next" } },
  };
  assert.equal(await findMyJourney(api, "201"), journey);
  api.journeys = async () => ({
    data: [],
    meta: { hasMore: true, nextCursor: "same" },
  });
  await assert.rejects(findMyJourney(api, "201"), /끝까지/);
});

test("BUS and SOLO choice forward stable keys and only accept the matching server outcome", async () => {
  for (const mode of ["BUS", "SOLO"]) {
    const expected = {
      ...journey,
      outcome: mode === "BUS" ? "BUS_SELECTED" : "SOLO_SELECTED",
    };
    const calls = [];
    const api = {
      chooseJourney: async (...args) => {
        calls.push(args);
        return { data: expected };
      },
    };
    const data = { journey, rideRequest: request };
    assert.equal(
      await recordJourneyChoice(api, data, mode, "stable-key"),
      expected,
    );
    await recordJourneyChoice(api, data, mode, "stable-key");
    assert.deepEqual(calls, [
      ["201", mode, "stable-key"],
      ["201", mode, "stable-key"],
    ]);
  }
});

test("choice cannot fabricate success or overwrite a resolved journey", async () => {
  const data = { journey, rideRequest: request };
  await assert.rejects(
    recordJourneyChoice({}, data, "POOL_BOARDED", "key"),
    /최신/,
  );
  await assert.rejects(
    recordJourneyChoice(
      {},
      { ...data, journey: { ...journey, outcome: "BUS_SELECTED" } },
      "SOLO",
      "key",
    ),
    /최신/,
  );
  await assert.rejects(
    recordJourneyChoice(
      {
        chooseJourney: async () => ({
          data: { ...journey, outcome: "BUS_SELECTED" },
        }),
      },
      data,
      "SOLO",
      "key",
    ),
    /선택 결과/,
  );
  await assert.rejects(
    recordJourneyChoice(
      {
        chooseJourney: async () => {
          throw Object.assign(new Error("leave"), {
            code: "PARTY_LEAVE_REQUIRED",
          });
        },
      },
      data,
      "BUS",
      "key",
    ),
    { code: "PARTY_LEAVE_REQUIRED" },
  );
});
