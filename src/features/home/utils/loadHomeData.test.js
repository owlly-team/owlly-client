import test from "node:test";
import assert from "node:assert/strict";
import {
  getSlotDates,
  getUserScopedData,
  loadCurrentRide,
  loadHomePickupPoints,
  selectSchoolPickupPoint,
  upcomingSlots,
} from "./loadHomeData.js";

test("an observed FAILED request remains discoverable after activeRequestId becomes null", async () => {
  const journey = { id: "1", outcome: "UNRESOLVED", activeRequestId: null };
  const request = { id: "11", journeyId: "1", status: "FAILED" };
  const api = {
    journeys: async () => ({ data: [journey] }),
    rideRequest: async () => ({ data: request }),
  };
  assert.equal((await loadCurrentRide(api)).rideRequest, null);
  const recovered = await loadCurrentRide(api, {
    knownRequests: [{ journeyId: "1", requestId: "11" }],
  });
  assert.equal(recovered.rideRequest, request);
  assert.equal(recovered.party, null);
  api.journeys = async () => ({
    data: [{ ...journey, outcome: "SOLO_SELECTED" }],
  });
  assert.equal(
    (
      await loadCurrentRide(api, {
        knownRequests: [{ journeyId: "1", requestId: "11" }],
      })
    ).rideRequest,
    null,
  );
});

test("an active request takes priority over an older failed journey", async () => {
  const api = {
    journeys: async () => ({
      data: [
        { id: "1", outcome: "UNRESOLVED", activeRequestId: null },
        { id: "2", outcome: "UNRESOLVED", activeRequestId: "22" },
      ],
    }),
    rideRequest: async (id) => ({
      data:
        id === "11"
          ? { id, journeyId: "1", status: "FAILED" }
          : { id, journeyId: "2", status: "WAITING" },
    }),
  };
  assert.equal(
    (
      await loadCurrentRide(api, {
        knownRequests: [{ journeyId: "1", requestId: "11" }],
      })
    ).rideRequest.id,
    "22",
  );
});

test("home departure defaults to the account school, keeping explicit and active selections", () => {
  const shared = { id: "11", universityId: null };
  const other = { id: "21", universityId: "2" };
  const school = { id: "31", universityId: "1" };
  const points = [shared, other, school];
  assert.equal(selectSchoolPickupPoint(points, { universityId: "1" }), school);
  assert.equal(
    selectSchoolPickupPoint(points, { universityId: "1", selectedId: "11" }),
    shared,
  );
  assert.equal(
    selectSchoolPickupPoint(points, { universityId: "1", activeId: "31" }),
    school,
  );
  assert.equal(
    selectSchoolPickupPoint(points, { universityId: "1", selectedId: "21" }),
    school,
  );
  assert.equal(
    selectSchoolPickupPoint([shared, other], { universityId: "1" }),
    null,
  );
});

test("empty school results are checked against all points without selecting another school's point", async () => {
  const calls = [];
  const api = {
    pickupPoints: async (universityId) => {
      calls.push(universityId);
      return { data: universityId ? [] : [{ id: "9", universityId: "2" }] };
    },
  };
  assert.deepEqual(await loadHomePickupPoints(api, "1"), {
    pickupPoints: [],
    pickupAvailability: "SCHOOL_EMPTY",
  });
  assert.deepEqual(calls, ["1", undefined]);
  api.pickupPoints = async () => ({ data: [] });
  assert.equal(
    (await loadHomePickupPoints(api, "1")).pickupAvailability,
    "ALL_EMPTY",
  );
});

test("filter mismatch recovers only this school's and shared points", async () => {
  const own = { id: "1", universityId: "1" };
  const shared = { id: "2", universityId: null };
  const other = { id: "3", universityId: "2" };
  const api = {
    pickupPoints: async (id) => ({ data: id ? [] : [own, shared, other] }),
  };
  const result = await loadHomePickupPoints(api, "1");
  assert.equal(result.pickupAvailability, "FILTER_MISMATCH");
  assert.deepEqual(result.pickupPoints, [own, shared]);
  await assert.rejects(loadHomePickupPoints(api, undefined), /학교/);
});

test("initial session loading and missing location never expose null state or another user's data", () => {
  for (const userId of [undefined, null, "101"]) {
    assert.equal(getUserScopedData(null, userId), null);
    assert.equal(getUserScopedData(undefined, userId)?.point ?? null, null);
  }
  assert.equal(
    getUserScopedData({ userId: undefined, point: {} }, undefined),
    null,
  );
  assert.equal(getUserScopedData({ userId: "102", point: {} }, "101"), null);
  const own = { userId: "101", point: { latitude: 0, longitude: 0 } };
  assert.equal(getUserScopedData(own, "101"), own);
});

test("journey pagination restores an active request even after boarding was recorded", async () => {
  const calls = [];
  const api = {
    journeys: async (cursor) => {
      calls.push(cursor);
      return cursor
        ? {
            data: [
              {
                id: "2",
                activeRequestId: "12",
                outcome: "POOL_BOARDED",
                intendedDepartureAt: "2026-11-14T00:00:00+09:00",
              },
            ],
          }
        : { data: [], meta: { hasMore: true, nextCursor: "next" } };
    },
    rideRequest: async () => ({
      data: { id: "12", journeyId: "2", status: "MATCHED", partyId: "22" },
    }),
    party: async () => ({
      data: { id: "22", myMemberId: "32", status: "RIDING" },
      etag: '"party-2"',
    }),
    settlement: async () => ({
      data: {
        partyId: "22",
        items: [{ memberId: "32", estimatedShareWon: 0 }],
      },
    }),
  };
  const data = await loadCurrentRide(api);
  assert.deepEqual(calls, [undefined, "next"]);
  assert.equal(data.partyEtag, '"party-2"');
  assert.equal(data.mySettlementItem.estimatedShareWon, 0);
});

test("mismatched IDs and broken pagination never become an empty successful home", async () => {
  const journeys = async () => ({ data: [{ id: "1", activeRequestId: "11" }] });
  await assert.rejects(
    loadCurrentRide({
      journeys,
      rideRequest: async () => ({ data: { id: "other", journeyId: "1" } }),
    }),
    /일치/,
  );
  await assert.rejects(
    loadCurrentRide({
      journeys: async () => ({
        data: [],
        meta: { hasMore: true, nextCursor: "same" },
      }),
    }),
    /끝까지/,
  );
});

test("settlement not ready preserves the matched party without fabricating a fare", async () => {
  const api = {
    journeys: async () => ({ data: [{ id: "1", activeRequestId: "11" }] }),
    rideRequest: async () => ({
      data: { id: "11", journeyId: "1", status: "MATCHED", partyId: "21" },
    }),
    party: async () => ({
      data: { id: "21", status: "CONFIRMING", myMemberId: "31" },
    }),
    settlement: async () => {
      throw Object.assign(new Error(), { code: "SETTLEMENT_NOT_READY" });
    },
  };
  const data = await loadCurrentRide(api);
  assert.equal(data.party.id, "21");
  assert.equal(data.settlement, null);
  assert.equal(data.mySettlementItem, undefined);
  api.settlement = async () => {
    throw Object.assign(new Error("expired"), { status: 401 });
  };
  await assert.rejects(loadCurrentRide(api), /expired/);
});

test("terminal requests and completed parties do not show an ongoing match", async () => {
  const api = {
    journeys: async () => ({ data: [{ id: "1", activeRequestId: "11" }] }),
    rideRequest: async () => ({
      data: { id: "11", journeyId: "1", status: "FAILED" },
    }),
  };
  assert.equal((await loadCurrentRide(api)).rideRequest, null);
  api.rideRequest = async () => ({
    data: { id: "11", journeyId: "1", status: "MATCHED", partyId: "21" },
  });
  api.party = async () => ({ data: { id: "21", status: "COMPLETED" } });
  assert.equal((await loadCurrentRide(api)).party, null);
});

test("slots include tomorrow's actual Korean date and exclude past departures", () => {
  assert.deepEqual(getSlotDates(new Date("2026-11-13T14:59:00Z")), [
    "2026-11-13",
    "2026-11-14",
  ]);
  const slots = [
    {
      departureAt: "2026-11-14T00:30:00+09:00",
      registrationAllowed: true,
      waitingCount: 0,
    },
    { departureAt: "2026-11-13T22:00:00+09:00", registrationAllowed: true },
    { departureAt: "2026-11-14T00:00:00+09:00", registrationAllowed: false },
  ];
  assert.deepEqual(
    upcomingSlots(slots, Date.parse("2026-11-13T23:59:00+09:00")),
    [slots[2], slots[0]],
  );
});
