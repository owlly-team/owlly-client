import test from "node:test";
import assert from "node:assert/strict";
import { getMatchingUiState, toHomeViewData, toTransportOptionCards } from "./homeUtils.js";
import { homeScenarios } from "../mocks/homeMockData.js";

test("four home scenarios use API DTOs without changing screenshot values", () => {
  const before = toHomeViewData(homeScenarios.beforeLastTransit);
  assert.equal(before.lastTransit.time, "22:58");
  assert.equal(before.lastTransit.note, "22:49까지 출발해야 해요");
  assert.equal(before.lastTransit.place, "정문 정류장 · 도보 4분");
  assert.equal(before.transportDisplay.carpool.description, "23:30 출발 · 00:00 도착");
  const after = toHomeViewData(homeScenarios.afterLastTransit);
  assert.equal(homeScenarios.afterLastTransit.travelOptions.transit.available, false);
  assert.equal(after.transportDisplay.carpool.description, "00:00 출발 · 00:30 도착");
  assert.equal(after.transportDisplay.carpool.highlight, "영통구 방향 1명 대기");
  assert.equal(getMatchingUiState(homeScenarios.waiting.rideRequest.status, null), "MATCHING_WAITING");
  assert.equal(getMatchingUiState(homeScenarios.matched.rideRequest.status, homeScenarios.matched.party.status), "MATCHING_RESULT");
  const matched = toHomeViewData(homeScenarios.matched);
  assert.equal(matched.matchingDisplay.matchedCompanionCount, 3);
  assert.equal(matched.matchingDisplay.estimatedShareWon, 7900);
});

test("matched request renders while party loads; terminal requests return to comparison", () => {
  assert.equal(getMatchingUiState("MATCHED", null), "MATCHING_RESULT");
  for (const status of ["FAILED", "CANCELLED", "EXPIRED", null]) {
    assert.equal(getMatchingUiState(status, null), null);
  }
  assert.equal(getMatchingUiState("MATCHED", "READY"), "RIDE_IN_PROGRESS");
});

test("missing API values never fabricate deadlines, arrival times, or fares", () => {
  const result = toHomeViewData({ ...homeScenarios.matched, matchedAt: null, presentation: {}, mySettlementItem: null });
  assert.equal(result.matchingDisplay.confirmationTimeLabel, undefined);
  assert.equal(result.matchingDisplay.remainingTimeLabel, undefined);
  assert.equal(result.matchingDisplay.estimatedShareWon, undefined);
  assert.equal(result.transportDisplay.carpool.description, "23:30 출발");
  assert.equal(toTransportOptionCards({ soloTaxiEstimatedWon: null })[2].price, "금액 미정");
  assert.doesNotThrow(() => toHomeViewData({}));
});

test("confirmation expires exactly five minutes after matching", () => {
  const data = homeScenarios.matched;
  const start = Date.parse(data.matchedAt);
  const initial = toHomeViewData(data, start).matchingDisplay;
  assert.equal(initial.confirmationTimeLabel, "22:49");
  assert.equal(initial.remainingTimeLabel, "5분 남음");
  assert.equal(initial.confirmationExpired, false);
  assert.equal(toHomeViewData(data, start + 60000).matchingDisplay.remainingTimeLabel, "4분 남음");
  assert.equal(toHomeViewData(data, start + 299999).matchingDisplay.confirmationExpired, false);
  assert.equal(toHomeViewData(data, start + 300000).matchingDisplay.confirmationExpired, true);
  assert.equal(toHomeViewData(data, start + 600000).matchingDisplay.remainingTimeLabel, "확정 기한 만료");
});

test("API-20 waiting deadline is not a confirmation deadline or another slot's count", () => {
  const data = {
    ...homeScenarios.waiting,
    rideRequest: { ...homeScenarios.waiting.rideRequest, resultDueAt: "2026-11-09T23:08:00+09:00" },
    matchingSlots: [{ departureAt: "2026-11-10T00:00:00+09:00", waitingCount: 9, registrationAllowed: true, reason: null }],
  };
  const display = toHomeViewData(data).matchingDisplay;
  assert.equal(display.resultDueLabel, "23:08까지 결과 안내 예정이에요");
  assert.equal(display.waitingCount, undefined);
  assert.equal(display.confirmationTimeLabel, undefined);
  assert.equal(toHomeViewData(homeScenarios.waiting).matchingDisplay.resultDueLabel, "결과는 막차 전에 알려 드려요");
});

test("failed request uses next available slot instead of stale party departure", () => {
  const data = {
    ...homeScenarios.matched,
    rideRequest: { ...homeScenarios.matched.rideRequest, status: "FAILED", partyId: null },
    matchingSlots: [{ departureAt: "2026-11-10T00:00:00+09:00", waitingCount: 0, registrationAllowed: true, reason: null }],
  };
  const view = toHomeViewData(data);
  assert.equal(view.matchingDisplay.departureTime, "00:00");
  assert.equal(view.matchingDisplay.matchedCompanionCount, undefined);
});
