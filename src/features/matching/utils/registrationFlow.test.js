import test from "node:test";
import assert from "node:assert/strict";
import {
  createRegistrationAttempt,
  normalizeMatchingIds,
  registrationFingerprint,
  submitRegistration,
} from "./registrationFlow.js";

const selection = {
  pickupPoint: { id: "11" },
  destination: { id: "31", point: { latitude: 0, longitude: 0 } },
  sameGenderOnly: false,
};
const slot = {
  departureAt: "2026-11-14T23:30:00+09:00",
  registrationAllowed: true,
};
const makeAttempt = (value = selection) => {
  let id = 0;
  return createRegistrationAttempt(value, slot, () => `key-${++id}`);
};
const journey = {
  id: "201",
  pickupPointId: "11",
  intendedDepartureAt: slot.departureAt,
};
const ride = {
  id: "301",
  journeyId: "201",
  pickupPointId: "11",
  departureAt: slot.departureAt,
  sameGenderOnly: false,
  status: "WAITING",
};

test("request retry reuses the created journey and the exact command keys and body", async () => {
  const attempt = makeAttempt();
  const journeyCalls = [];
  const rideCalls = [];
  const api = {
    createJourney: async (...args) => {
      journeyCalls.push(args);
      return { data: journey };
    },
    createRideRequest: async (...args) => {
      rideCalls.push(args);
      if (rideCalls.length === 1) throw new Error("network");
      return { data: ride };
    },
  };
  await assert.rejects(submitRegistration(api, attempt), /network/);
  assert.equal(attempt.journeyId, "201");
  assert.equal(await submitRegistration(api, attempt), ride);
  assert.equal(journeyCalls.length, 1);
  assert.deepEqual(rideCalls[0], rideCalls[1]);
  assert.equal(rideCalls[0][1].sameGenderOnly, false);
  assert.deepEqual(rideCalls[0][1].dropoff, { latitude: 0, longitude: 0 });
});

test("unknown journey creation result retries the same client and header keys", async () => {
  const attempt = makeAttempt();
  const calls = [];
  const api = {
    createJourney: async (...args) => {
      calls.push(args);
      if (calls.length === 1) throw new Error("lost response");
      return { data: journey };
    },
    createRideRequest: async () => ({ data: ride }),
  };
  await assert.rejects(submitRegistration(api, attempt), /lost response/);
  await submitRegistration(api, attempt);
  assert.deepEqual(calls[0], calls[1]);
});

test("re-registration uses the same journey while changed choices have a new fingerprint", async () => {
  const attempt = makeAttempt({ ...selection, journeyId: "201" });
  const result = await submitRegistration(
    {
      createRideRequest: async (id) => {
        assert.equal(id, "201");
        return { data: ride };
      },
    },
    attempt,
  );
  assert.equal(result.id, "301");
  assert.notEqual(
    registrationFingerprint(selection, slot),
    registrationFingerprint({ ...selection, sameGenderOnly: true }, slot),
  );
  assert.throws(
    () => makeAttempt({ ...selection, destination: { id: "31" } }),
    /다시 확인/,
  );
});

test("mismatched responses never become a successful registration", async () => {
  await assert.rejects(
    submitRegistration(
      {
        createJourney: async () => ({
          data: { ...journey, pickupPointId: "99" },
        }),
      },
      makeAttempt(),
    ),
    /귀가 정보/,
  );
  await assert.rejects(
    submitRegistration(
      {
        createJourney: async () => ({ data: journey }),
        createRideRequest: async () => ({
          data: { ...ride, journeyId: "202" },
        }),
      },
      makeAttempt(),
    ),
    /일치하지/,
  );
});

test("Swagger numeric IDs normalize without changing booleans, amounts or route versions", () => {
  assert.deepEqual(
    normalizeMatchingIds({
      id: 1,
      partyId: 2,
      members: [{ memberId: 3 }],
      orderedMemberIds: [4, "5"],
      routeVersion: 2,
      amountWon: 0,
      sameGenderOnly: false,
    }),
    {
      id: "1",
      partyId: "2",
      members: [{ memberId: "3" }],
      orderedMemberIds: ["4", "5"],
      routeVersion: 2,
      amountWon: 0,
      sameGenderOnly: false,
    },
  );
  assert.throws(
    () => normalizeMatchingIds({ id: Number.MAX_SAFE_INTEGER + 1 }),
    /정확한 ID/,
  );
});
