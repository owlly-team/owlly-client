import test from "node:test";
import assert from "node:assert/strict";
import { toSoloTaxiView } from "./soloTaxiView.js";
import { createTransportAttempt, submitTransportChoice } from "./busChoice.js";

const now = Date.parse("2026-11-05T23:50:00+09:00");
const context = {
  pickupPoint: { id: "11", name: "단국대 정문", meetingNote: "큰길 쪽" },
  dropoff: { latitude: 37.33, longitude: 127.27 },
  travelOptions: {
    destinationDongId: "31",
    destinationDongName: "영통2동",
    soloTaxiEstimatedWon: 27400,
    soloTaxiDurationMin: 34,
    soloTaxiDistanceM: 21000,
    poolEstimatedShareWon: 7900,
    asOf: "2026-11-05T23:50:00+09:00",
    estimatedArrivalAt: "2026-11-06T00:24:00+09:00",
    transit: { available: false },
  },
};
const journeyFor = (attempt) => ({
  id: "201",
  pickupPointId: "11",
  destinationDongId: "31",
  intendedDepartureAt: attempt.body.intendedDepartureAt,
  outcome: "UNRESOLVED",
  activeRequestId: null,
});

test("solo taxi shows actual fares, distance and times across midnight without inventing missing values", () => {
  const view = toSoloTaxiView(context);
  assert.equal(view.durationLabel, "34분");
  assert.equal(view.distanceLabel, "21km");
  assert.equal(view.fareLabel, "27,400원");
  assert.equal(view.poolTitle, "동승하면 약 7,900원");
  assert.deepEqual(
    view.steps.map((step) => step.time),
    ["23:50", "23:50", "00:24"],
  );
  assert.equal(view.steps[0].description, "큰길 쪽");
  const missing = toSoloTaxiView();
  assert.equal(missing.durationLabel, "소요 시간 미정");
  assert.equal(missing.distanceLabel, null);
  assert.equal(missing.fareLabel, "금액 미정");
  const zero = toSoloTaxiView({
    travelOptions: {
      soloTaxiEstimatedWon: 0,
      soloTaxiDurationMin: 0,
      soloTaxiDistanceM: 0,
    },
  });
  assert.equal(zero.fareLabel, "0원");
  assert.equal(zero.durationLabel, "0분");
  assert.equal(zero.distanceLabel, "0km");
});

test("solo choice works after last train, creates once and reuses the same choice key after a lost response", async () => {
  const attempt = createTransportAttempt(context, "SOLO", now);
  const journey = journeyFor(attempt);
  const calls = [];
  const api = {
    createJourney: async (body, key) => {
      calls.push(["create", body, key]);
      return { data: journey };
    },
    chooseJourney: async (...args) => {
      calls.push(["choice", ...args]);
      if (calls.length === 2) throw new Error("response lost");
      return { data: { ...journey, outcome: "SOLO_SELECTED" } };
    },
  };
  assert.equal(calls.length, 0);
  await assert.rejects(submitTransportChoice(api, attempt), /response lost/);
  assert.equal(
    (await submitTransportChoice(api, attempt)).outcome,
    "SOLO_SELECTED",
  );
  assert.equal(calls.filter(([action]) => action === "create").length, 1);
  assert.deepEqual(calls[1], calls[2]);
  assert.equal(calls[1][2], "SOLO");
});

test("solo choice reuses a matching active journey and requires the server to cancel its waiting request", async () => {
  const first = createTransportAttempt(context, "SOLO", now);
  const journey = { ...journeyFor(first), activeRequestId: "301" };
  const attempt = createTransportAttempt({ ...context, journey }, "SOLO", now);
  const api = {
    chooseJourney: async (id, mode) => {
      assert.equal(id, journey.id);
      assert.equal(mode, "SOLO");
      return {
        data: { ...journey, outcome: "SOLO_SELECTED", activeRequestId: null },
      };
    },
  };
  assert.equal(
    (await submitTransportChoice(api, attempt)).activeRequestId,
    null,
  );
  for (const invalid of [
    { ...journey, outcome: "BUS_SELECTED" },
    { ...journey, outcome: "SOLO_SELECTED" },
    { ...journey, id: "999", outcome: "SOLO_SELECTED", activeRequestId: null },
  ]) {
    await assert.rejects(
      submitTransportChoice(
        { chooseJourney: async () => ({ data: invalid }) },
        attempt,
      ),
    );
  }
  await assert.rejects(
    submitTransportChoice(
      {},
      { ...attempt, journey: { ...journey, outcome: "BUS_SELECTED" } },
    ),
    (error) => error.code === "JOURNEY_ALREADY_RESOLVED",
  );
});
