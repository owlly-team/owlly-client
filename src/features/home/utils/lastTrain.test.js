import test from "node:test";
import assert from "node:assert/strict";
import { toLastTrainView } from "./lastTrainView.js";
import { loadLastTrain, hasFreshTravelContext } from "./loadLastTrain.js";
import { createBusAttempt, submitBusChoice } from "./busChoice.js";

const now = Date.parse("2026-11-05T13:30:00Z");

test("home travel response is reused for 15 seconds only for its own pickup and valid coordinates", async () => {
  const source = {
    pickupPoint: { id: "11" },
    dropoff: { latitude: 37.33, longitude: 127.27 },
    travelOptions: {
      pickupPointId: "11",
      destinationDongId: "105",
      asOf: new Date(now).toISOString(),
    },
  };
  assert.equal(hasFreshTravelContext(source, now + 14999), true);
  assert.equal(await loadLastTrain({}, source, "101", now + 14999), source);
  assert.equal(hasFreshTravelContext(source, now + 15000), false);
  assert.equal(hasFreshTravelContext(source, now - 1), false);
  assert.equal(
    hasFreshTravelContext({ ...source, pickupPoint: { id: "other" } }, now),
    false,
  );
  let calls = 0;
  const refreshed = await loadLastTrain(
    {
      travelOptions: async () => {
        calls++;
        return { data: { destinationDongId: "105" } };
      },
    },
    source,
    "101",
    now + 15000,
  );
  assert.equal(calls, 1);
  assert.notEqual(refreshed.travelOptions, source.travelOptions);
});
const context = {
  pickupPoint: { id: "11", name: "단국대 정문", universityId: "1" },
  dropoff: { latitude: 37.33, longitude: 127.27 },
  travelOptions: {
    destinationDongId: "105",
    destinationDongName: "영통2동",
    warnings: ["버스·도보 소요 시간은 추정이에요"],
    transit: {
      available: true,
      lastLeaveAt: "2026-11-05T13:49:00Z",
      arrivalAt: "2026-11-05T14:41:00Z",
      estimatedCostWon: 1550,
      totalDurationMin: 43,
      sourceLabel: "경기도 버스 시간표(GBIS) 기준 막차",
      legs: [
        {
          mode: "WALK",
          fromName: "출발 위치",
          toName: "단국대정문 정류장",
          departureAt: "2026-11-05T13:49:00Z",
          arrivalAt: "2026-11-05T13:53:00Z",
          distanceM: 298,
        },
        {
          mode: "BUS",
          routeName: "720-3",
          fromName: "단국대정문 정류장",
          toName: "영통역8번출구",
          departureAt: "2026-11-05T13:58:00Z",
          arrivalAt: "2026-11-05T14:38:00Z",
          stopCount: 41,
          lastBus: true,
        },
        {
          mode: "WALK",
          fromName: "영통역8번출구",
          toName: "하차 지점",
          departureAt: "2026-11-05T14:38:00Z",
          arrivalAt: "2026-11-05T14:41:00Z",
          distanceM: 131,
        },
      ],
    },
  },
};
const journeyFor = (body) => ({
  id: "201",
  universityId: "1",
  pickupPointId: body.pickupPointId,
  destinationDongId: "105",
  intendedDepartureAt: body.intendedDepartureAt,
  outcome: "UNRESOLVED",
  activeRequestId: null,
});

test("API-14 fields and UTC times render as KST without replacing the server duration", () => {
  const view = toLastTrainView(context);
  assert.equal(view.durationLabel, "43분");
  assert.equal(view.fareLabel, "1,550원");
  assert.equal(view.deadlineLabel, "22:49까지 출발해야 해요");
  assert.equal(view.transferLabel, "환승 없음");
  assert.deepEqual(
    view.steps.map((step) => step.time),
    ["22:49", "22:58", "23:38", "23:38", "23:41"],
  );
  assert.match(view.steps[0].description, /도보 4분 · 298m · 5분/);
  assert.match(
    view.steps[1].description,
    /720-3 · 오늘 이 방향 마지막 버스 · 41개 정류장 · 40분/,
  );
  assert.equal(view.steps.at(-1).title, "영통2동 도착");
  assert.deepEqual(view.warnings, context.travelOptions.warnings);
  assert.equal(view.sourceLabel, context.travelOptions.transit.sourceLabel);
});

test("unavailable/missing transit never produces a route; missing and zero values remain distinct", () => {
  assert.equal(toLastTrainView().available, false);
  const unavailable = toLastTrainView({
    travelOptions: {
      transit: { available: false, legs: context.travelOptions.transit.legs },
    },
  });
  assert.deepEqual(unavailable.steps, []);
  const missing = toLastTrainView({
    travelOptions: { transit: { available: true, legs: [] } },
  });
  assert.equal(missing.fareLabel, "금액 미정");
  assert.equal(missing.durationLabel, "소요 시간 미정");
  const free = toLastTrainView({
    ...context,
    travelOptions: {
      ...context.travelOptions,
      transit: {
        ...context.travelOptions.transit,
        estimatedCostWon: 0,
        totalDurationMin: 0,
      },
    },
  });
  assert.equal(free.fareLabel, "0원");
  assert.equal(free.durationLabel, "0분");
});

test("direct access restores the user's school pickup/profile; home context keeps the selected pin", async () => {
  const bodies = [];
  const api = {
    profile: async () => ({
      data: {
        user: { id: "101", universityId: "1" },
        defaultDropoff: context.dropoff,
      },
    }),
    pickupPoints: async () => ({ data: [context.pickupPoint] }),
    travelOptions: async (body) => {
      bodies.push(body);
      return { data: context.travelOptions };
    },
  };
  const direct = await loadLastTrain(api, null, "101", now);
  assert.equal(direct.pickupPoint.id, "11");
  await loadLastTrain(
    { travelOptions: api.travelOptions },
    context,
    "101",
    now,
  );
  assert.deepEqual(bodies[1], {
    pickupPointId: "11",
    dropoff: context.dropoff,
    departureAt: new Date(now).toISOString(),
  });
  await assert.rejects(loadLastTrain(api, null, "other-user", now));
  await assert.rejects(
    loadLastTrain(
      {
        travelOptions: async () => ({
          data: { ...context.travelOptions, pickupPointId: "99" },
        }),
      },
      context,
      "101",
      now,
    ),
  );
});

test("choosing bus creates API-15 once and reuses API-17's exact retry key after a lost response", async () => {
  const attempt = createBusAttempt(context, now);
  const calls = [];
  let journey;
  let first = true;
  const api = {
    createJourney: async (body, key) => {
      calls.push(["create", key]);
      journey = journeyFor(body);
      return { data: journey };
    },
    chooseJourney: async (id, mode, key) => {
      calls.push(["choice", id, mode, key]);
      if (first) {
        first = false;
        throw new Error("response lost");
      }
      return {
        data: { ...journey, outcome: "BUS_SELECTED", activeRequestId: null },
      };
    },
  };
  await assert.rejects(submitBusChoice(api, attempt), /response lost/);
  assert.equal((await submitBusChoice(api, attempt)).outcome, "BUS_SELECTED");
  assert.equal(calls.filter(([kind]) => kind === "create").length, 1);
  assert.deepEqual(calls[1], calls[2]);
  assert.equal(attempt.body.clientJourneyKey, attempt.createKey);
  assert.deepEqual(attempt.body.dropoff, context.dropoff);
  assert.equal(calls[1][2], "BUS");
});

test("API-15 retries preserve the original body and key; existing waiting journeys use API-17 only", async () => {
  const attempt = createBusAttempt(context, now);
  const bodies = [];
  const api = {
    createJourney: async (body, key) => {
      bodies.push([structuredClone(body), key]);
      throw new Error("offline");
    },
  };
  await assert.rejects(submitBusChoice(api, attempt));
  await assert.rejects(submitBusChoice(api, attempt));
  assert.deepEqual(bodies[0], bodies[1]);
  const journey = { ...journeyFor(attempt.body), activeRequestId: "301" };
  const existing = createBusAttempt({ ...context, journey }, now);
  const result = await submitBusChoice(
    {
      chooseJourney: async (id, mode) => {
        assert.equal(id, "201");
        assert.equal(mode, "BUS");
        return {
          data: { ...journey, activeRequestId: null, outcome: "BUS_SELECTED" },
        };
      },
    },
    existing,
  );
  assert.equal(result.activeRequestId, null);
});

test("expired transit, unrelated journeys, resolved outcomes and invalid response IDs cannot become successful choices", async () => {
  assert.throws(() =>
    createBusAttempt(
      context,
      Date.parse(context.travelOptions.transit.lastLeaveAt) + 1,
    ),
  );
  assert.throws(() =>
    createBusAttempt(
      { ...context, journey: { activeRequestId: "301", pickupPointId: "99" } },
      now,
    ),
  );
  const attempt = createBusAttempt(context, now);
  for (const outcome of ["CANCELLED", "SOLO_SELECTED", "POOL_BOARDED"]) {
    await assert.rejects(
      submitBusChoice(
        {},
        { ...attempt, journey: { ...journeyFor(attempt.body), outcome } },
      ),
      (error) => error.code === "JOURNEY_ALREADY_RESOLVED",
    );
  }
  const matching = { ...journeyFor(attempt.body), activeRequestId: "301" };
  const error = Object.assign(new Error("leave required"), {
    code: "PARTY_LEAVE_REQUIRED",
  });
  await assert.rejects(
    submitBusChoice(
      {
        chooseJourney: async () => {
          throw error;
        },
      },
      { ...attempt, journey: matching },
    ),
    (failure) => failure === error,
  );
  await assert.rejects(
    submitBusChoice(
      {
        createJourney: async () => ({
          data: { ...journeyFor(attempt.body), destinationDongId: "999" },
        }),
      },
      { ...attempt },
    ),
  );
  await assert.rejects(
    submitBusChoice(
      {
        chooseJourney: async () => ({
          data: {
            ...matching,
            id: "999",
            outcome: "BUS_SELECTED",
            activeRequestId: null,
          },
        }),
      },
      { ...attempt, journey: matching },
    ),
  );
});
