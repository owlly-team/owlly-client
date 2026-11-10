import test from "node:test";
import assert from "node:assert/strict";
import { toRegistrationView } from "./registrationUtils.js";
import { createMockRegistration } from "./matchingMockData.js";

const slot = { departureAt: "2026-11-10T00:00:00+09:00", waitingCount: 0, registrationAllowed: true, reason: null };
const data = createMockRegistration(slot);

test("registration renders API response values, including false and zero", () => {
  const request = { ...data.rideRequest, sameGenderOnly: false, resultDueAt: "2026-11-09T23:45:00+09:00" };
  const view = toRegistrationView(request, slot);
  assert.equal(view.rows[0].value, "단국대 정문 · 00:00");
  assert.equal(view.rows[2].value, "꺼짐");
  assert.equal(view.rows[3].value, "0명");
  assert.equal(view.resultDueLabel, "23:45까지 매칭 결과 안내 예정이에요.");
});

test("missing request never displays successful registration", () => {
  assert.equal(toRegistrationView(null).title, "신청 정보를 확인할 수 없어요");
  assert.deepEqual(toRegistrationView(null).rows, []);
});

test("all API-20 terminal states use their own actions", () => {
  for (const status of ["FAILED", "CANCELLED", "EXPIRED"]) {
    const view = toRegistrationView({ ...data.rideRequest, status, partyId: "401" });
    assert.equal(view.canRetry, true);
    assert.equal(view.waiting, false);
    assert.equal(view.partyId, null);
  }
  const matched = toRegistrationView({ ...data.rideRequest, status: "MATCHED", partyId: "401" });
  assert.equal(matched.partyId, "401");
  assert.equal(matched.waiting, false);
});

test("missing response names and unrelated waiting counts are not fabricated", () => {
  const view = toRegistrationView({
    ...data.rideRequest, pickupPointName: undefined, destinationDongName: undefined,
  }, { ...slot, departureAt: "2026-11-10T00:30:00+09:00", waitingCount: 9 });
  assert.equal(view.rows[0].value, "거점 확인 필요 · 00:00");
  assert.equal(view.rows[1].value, "하차 지점 확인 필요");
  assert.equal(view.rows[3].value, "확인 필요");
});

test("mock response keeps selected IDs and names together without a separate display object", () => {
  const mock = createMockRegistration(slot, {
    pickupPoint: { id: "12", name: "역 앞 거점" },
    destination: { id: "32", name: "죽전1동", districtId: "22", districtName: "용인시 수지구" },
    universityId: "2", universityName: "예시대학교", sameGenderOnly: false,
  });
  assert.equal(mock.display, undefined);
  assert.equal(mock.rideRequest.pickupPointId, "12");
  assert.equal(mock.rideRequest.pickupPointName, "역 앞 거점");
  assert.equal(mock.rideRequest.destinationDongId, "32");
  assert.equal(mock.rideRequest.destinationDongName, "죽전1동");
  assert.equal(mock.rideRequest.districtId, "22");
  assert.equal(mock.rideRequest.districtName, "용인시 수지구");
  assert.equal(mock.rideRequest.universityId, "2");
  assert.equal(mock.rideRequest.universityName, "예시대학교");
  const view = toRegistrationView(mock.rideRequest, slot);
  assert.equal(view.rows[0].value, "역 앞 거점 · 00:00");
  assert.equal(view.rows[1].value, "죽전1동");
  assert.equal(view.rows[2].value, "꺼짐");
});
