import test from "node:test";
import assert from "node:assert/strict";
import { getMatchingUiState, toHomeViewData, toTransportOptionCards } from "./homeUtils.js";
import { homeScenarios } from "./homeMockData.js";

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
