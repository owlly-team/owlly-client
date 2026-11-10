import test from "node:test";
import assert from "node:assert/strict";
import { distanceMeters, isMatchingSelection, isPoint, localDate } from "./mapUtils.js";

test("출발 날짜는 한국 시간 자정을 기준으로 바뀐다", () => {
  assert.equal(localDate(new Date("2026-11-05T14:59:00Z")), "2026-11-05");
  assert.equal(localDate(new Date("2026-11-05T15:00:00Z")), "2026-11-06");
});

test("현재 위치로부터 거점 거리를 미터로 계산한다", () => {
  const point = { latitude: 37.33, longitude: 127.27 };
  assert.equal(distanceMeters(point, point), 0);
  const distance = distanceMeters(point, { latitude: 37.34, longitude: 127.27 });
  assert.ok(distance > 1100 && distance < 1120);
});

test("유효하지 않은 좌표와 미확정 하차 지점은 조회에 사용하지 않는다", () => {
  assert.equal(isPoint({ latitude: 91, longitude: 127 }), false);
  assert.equal(isPoint({ latitude: NaN, longitude: 127 }), false);
  assert.equal(isPoint({ latitude: "37", longitude: 127 }), false);
  const selection = { pickupPoint: { id: "11" }, destination: { id: "31" }, sameGenderOnly: false };
  assert.equal(isMatchingSelection(selection), true);
  assert.equal(isMatchingSelection({ ...selection, destination: { regionCode: "4146310500" } }), false);
  assert.equal(isMatchingSelection({ ...selection, destination: { id: "0" } }), false);
});
