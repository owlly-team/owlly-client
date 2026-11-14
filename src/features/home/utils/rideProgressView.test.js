import test from "node:test";
import assert from "node:assert/strict";
import { homeScenarios } from "../mocks/homeMockData.js";
import { getHomeRideParty, toRideProgressView } from "./rideProgressView.js";
import { createRideProgressPreview } from "../mocks/rideProgressMock.js";

const data = homeScenarios.inProgress;
const preview = createRideProgressPreview(data.party);
const now = Date.parse(data.previewNow);

test("ongoing home shows pickup, companions, the same room code and ordered steps through midnight", () => {
  const view = toRideProgressView(data, preview.room, now, preview);
  assert.equal(view.title, "23:30 단국대 정문 출발");
  assert.equal(view.subtitle, "영통구 방향 · 3명 · 집결까지 8분");
  assert.equal(view.verificationCode, "4821");
  assert.equal(view.unreadCount, 2);
  assert.match(view.steps[0].description, /4821/);
  assert.equal(view.steps[1].title, "대표에게 9,500원 먼저 보내기");
  assert.deepEqual(
    view.steps.map((step) => step.time),
    ["23:30", "23:31", "23:35", "23:52", "00:00", "00:08"],
  );
  assert.equal(view.steps[4].title, "나 내림");
  assert.equal(view.steps[4].type, "home");
  assert.equal(view.steps.at(-1).title, "이*준 내림 · 대표");
});

test("live data never borrows demo times, unread counts or another room's code", () => {
  const live = { ...data, isPreview: false };
  const view = toRideProgressView(
    live,
    { ...preview.room, verificationCode: "0042" },
    now,
    preview,
  );
  assert.equal(view.verificationCode, "0042");
  assert.equal(view.unreadCount, null);
  assert.deepEqual(
    view.steps.map((step) => step.time),
    ["23:30", "집결 후", "입금 후", "미정", "미정", "미정"],
  );
  for (const room of [
    null,
    { ...preview.room, partyId: "other" },
    { ...preview.room, id: "other" },
    { ...preview.room, status: "CLOSED" },
    { ...preview.room, verificationCode: "12" },
  ]) {
    assert.equal(
      toRideProgressView(live, room, now, preview).verificationCode,
      null,
    );
  }
  assert.equal(createRideProgressPreview({ ...data.party, id: "other" }), null);
  assert.equal(getHomeRideParty({ rideRequest: { status: "MATCHED" } }), null);
  assert.equal(
    toRideProgressView(
      { ...data, rideRequest: { ...data.rideRequest, partyId: "other" } },
      preview.room,
    ),
    null,
  );
});

test("representative identity comes from IDs; missing or stale settlement cannot create a prepay amount", () => {
  const representative = {
    ...data,
    party: { ...data.party, myMemberId: "503" },
  };
  const view = toRideProgressView(representative, preview.room, now, preview);
  assert.equal(view.steps[1].title, "멤버들의 선입금 확인하기");
  assert.equal(view.steps.at(-1).type, "home");
  const missing = toRideProgressView(
    { ...data, settlement: { ...data.settlement, routeVersion: 99 } },
    preview.room,
    now,
  );
  assert.equal(missing.steps[1].title, "대표에게 선입금 보내기");
  const zero = structuredClone(data);
  zero.settlement.items.find((item) => item.memberId === "502").prepayDueWon =
    0;
  assert.equal(
    toRideProgressView(zero, preview.room, now).steps[1].title,
    "대표에게 0원 먼저 보내기",
  );
});

test("leave/decline exclusions and stop order apply without mutating the party or changing the representative", () => {
  const reordered = structuredClone(data);
  reordered.party.members.reverse();
  reordered.party.members.push({
    memberId: "removed",
    decision: "LEFT",
    stopOrder: 0,
  });
  const view = toRideProgressView(reordered, preview.room, now);
  assert.deepEqual(
    view.steps.slice(3).map((step) => step.id),
    ["501", "502", "503"],
  );
  assert.match(view.steps[2].title, /이\*준/);
  assert.equal(reordered.party.members[0].memberId, "503");
  for (const status of ["CONFIRMING", "COMPLETED", "CANCELLED"])
    assert.equal(
      getHomeRideParty({ ...data, party: { ...data.party, status } }),
      null,
    );
  const riding = toRideProgressView(
    { ...data, party: { ...data.party, status: "RIDING" } },
    preview.room,
    now,
  );
  assert.match(riding.subtitle, /탑승 중/);
});
