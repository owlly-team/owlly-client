import test from "node:test";
import assert from "node:assert/strict";
import {
  loadMatchingTravel,
  getMatchingTransitNotice,
} from "./matchingTravel.js";

const now = Date.parse("2026-11-14T23:00:00+09:00");
const point = { latitude: 37.32, longitude: 127.09 };
const request = {
  id: "301",
  journeyId: "201",
  partyId: "401",
  status: "MATCHED",
  pickupPointId: "11",
  destinationDongId: "31",
};
const party = {
  id: "401",
  myMemberId: "501",
  pickupPoint: { id: "11" },
  members: [{ memberId: "501" }],
};
const travelOptions = {
  pickupPointId: "11",
  destinationDongId: "31",
  soloTaxiEstimatedWon: 0,
  transit: { available: true, lastLeaveAt: "2026-11-14T23:05:00+09:00" },
};
function setup() {
  const calls = [];
  const api = {
    journeys: async () => ({ data: [{ id: "201", activeRequestId: "301" }] }),
    rideRequest: async () => ({ data: request }),
    party: async () => ({ data: party }),
    settlement: async () => ({ data: { partyId: "401", items: [] } }),
    profile: async () => ({
      data: { defaultDongId: "31", defaultDropoff: point },
    }),
    travelOptions: async (body) => {
      calls.push(body);
      return { data: travelOptions };
    },
  };
  return { api, calls };
}

test("direct entry restores the current party's conditions and requests current travel, preserving zero fare", async () => {
  const { api, calls } = setup();
  const result = await loadMatchingTravel(api, "401", undefined, now);
  assert.deepEqual(calls, [
    {
      pickupPointId: "11",
      dropoff: point,
      departureAt: new Date(now).toISOString(),
    },
  ]);
  assert.equal(result.travelOptions.soloTaxiEstimatedWon, 0);
  assert.equal(result.usingDefaultDropoff, true);
});

test("retained registration pin is used only for the same request, pickup and destination", async () => {
  const { api, calls } = setup();
  api.profile = () => assert.fail("exact retained pin should not need profile");
  const previous = {
    rideRequest: request,
    selection: { pickupPoint: { id: "11" }, destination: { id: "31", point } },
  };
  assert.equal(
    (await loadMatchingTravel(api, "401", previous, now)).usingDefaultDropoff,
    false,
  );
  assert.deepEqual(calls[0].dropoff, point);
  api.profile = async () => ({
    data: { defaultDongId: "other", defaultDropoff: point },
  });
  for (const selection of [
    { ...previous, rideRequest: { ...request, id: "other" } },
    {
      ...previous,
      selection: { ...previous.selection, pickupPoint: { id: "other" } },
    },
    {
      ...previous,
      selection: { ...previous.selection, destination: { id: "other", point } },
    },
  ])
    await assert.rejects(
      loadMatchingTravel(api, "401", selection, now),
      /복원/,
    );
  assert.equal(calls.length, 1);
});

test("server request coordinates take precedence over defaults and router state", async () => {
  const { api, calls } = setup();
  const exact = { latitude: 37.4, longitude: 127.2 };
  api.rideRequest = async () => ({ data: { ...request, dropoff: exact } });
  api.profile = () => assert.fail("server pin is sufficient");
  await loadMatchingTravel(api, "401", undefined, now);
  assert.deepEqual(calls[0].dropoff, exact);
});

test("another party or mismatched comparison response never supplies fares", async () => {
  const { api, calls } = setup();
  await assert.rejects(loadMatchingTravel(api, "other", undefined, now));
  assert.equal(calls.length, 0);
  for (const mismatch of [
    { destinationDongId: "other" },
    { pickupPointId: "other" },
  ]) {
    api.travelOptions = async () => ({
      data: { ...travelOptions, ...mismatch },
    });
    await assert.rejects(
      loadMatchingTravel(api, "401", undefined, now),
      /달라요/,
    );
  }
});

test("travel failures propagate instead of falling back to prior home prices", async () => {
  const { api } = setup();
  api.travelOptions = async () => {
    throw new Error("unavailable");
  };
  await assert.rejects(
    loadMatchingTravel(api, "401", { travelOptions }, now),
    /unavailable/,
  );
});

test("last transit deadline is independent of party confirmation and expires across midnight", () => {
  const midnight = "2026-11-15T00:05:00+09:00";
  const options = { transit: { available: true, lastLeaveAt: midnight } };
  assert.equal(
    getMatchingTransitNotice(options, Date.parse(midnight)).status,
    "available",
  );
  assert.equal(
    getMatchingTransitNotice(options, Date.parse(midnight) + 1).status,
    "unavailable",
  );
  assert.equal(
    getMatchingTransitNotice(
      { transit: { available: false, lastLeaveAt: midnight } },
      now,
    ).status,
    "unavailable",
  );
  for (const value of [
    undefined,
    {},
    { transit: { available: true } },
    { transit: { available: true, lastLeaveAt: "invalid" } },
  ])
    assert.equal(getMatchingTransitNotice(value, now).status, "unknown");
});
