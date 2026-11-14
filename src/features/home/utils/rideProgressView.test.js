import test from "node:test";
import assert from "node:assert/strict";
import { homeScenarios } from "../mocks/homeMockData.js";
import {
  getHomeRideParty,
  isHomeRideFinalized,
  toRideProgressView,
} from "./rideProgressView.js";
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

test("current step follows gathering, recorded prepay, taxi call, own boarding and settlement without inventing dropoffs", () => {
  const live = structuredClone({ ...data, isPreview: false });
  const view = (at = now) => toRideProgressView(live, preview.room, at);
  const current = (at) =>
    view(at).steps.find((step) => step.state === "current").id;
  const departure = Date.parse(live.party.departureAt);
  assert.equal(current(departure - 1), "meet");
  assert.equal(current(departure), "prepay");
  const payment = live.settlement.items.find(
    (item) => item.memberId === live.party.myMemberId,
  );
  payment.transfers = [
    {
      id: "901",
      kind: "PREPAY",
      settlementItemId: payment.id,
      payerMemberId: payment.memberId,
      payeeMemberId: live.party.representativeMemberId,
      status: "PENDING",
      amountWon: payment.prepayDueWon,
    },
  ];
  assert.equal(current(departure), "prepay");
  payment.transfers[0].status = "SENT";
  assert.equal(current(departure), "taxi");
  payment.transfers[0].payeeMemberId = "other";
  assert.equal(current(departure), "prepay");
  live.party.taxiCalledAt = live.party.departureAt;
  assert.equal(current(departure - 1), "taxi");
  assert.equal(view().steps[2].title, "택시 탑승 확인하기");
  live.party.members.find(
    (member) => member.memberId === live.party.myMemberId,
  ).boardingStatus = "BOARDED";
  assert.equal(current(), live.party.myMemberId);
  assert.ok(
    view()
      .steps.slice(0, 3)
      .every((step) => step.state === "past"),
  );
  assert.ok(
    view()
      .steps.slice(3)
      .filter((step) => step.id !== live.party.myMemberId)
      .every((step) => step.state === "upcoming"),
  );
  live.party.status = "SETTLING";
  assert.equal(current(), "settlement");
  assert.match(view().steps.at(-1).title, /정산 내역/);
});

test("representative advances from prepay only when all payers have server-recorded received amounts", () => {
  const live = structuredClone({ ...data, isPreview: false });
  live.party.myMemberId = live.party.representativeMemberId;
  const at = Date.parse(live.party.departureAt);
  const current = () =>
    toRideProgressView(live, preview.room, at).steps.find(
      (step) => step.state === "current",
    ).id;
  for (const member of live.party.members.filter(
    (member) => member.memberId !== live.party.representativeMemberId,
  )) {
    const item = live.settlement.items.find(
      (entry) => entry.memberId === member.memberId,
    );
    item.transfers = [
      {
        id: `9${member.memberId}`,
        kind: "PREPAY",
        settlementItemId: item.id,
        payerMemberId: member.memberId,
        payeeMemberId: live.party.representativeMemberId,
        amountWon: item.prepayDueWon,
        status: "SENT",
      },
    ];
  }
  assert.equal(current(), "prepay");
  for (const item of live.settlement.items)
    for (const transfer of item.transfers ?? []) transfer.status = "RECEIVED";
  assert.equal(current(), "taxi");
  live.settlement.routeVersion = 99;
  assert.equal(current(), "prepay");
});

test("finalized settlement hides ongoing home only for matching party and route with a valid finalization", () => {
  const finalized = {
    ...data,
    party: { ...data.party, status: "SETTLING" },
    settlement: {
      ...data.settlement,
      status: "REFUNDING",
      finalizedAt: "2026-11-10T00:10:00+09:00",
    },
  };
  assert.equal(isHomeRideFinalized(finalized), true);
  assert.equal(getHomeRideParty(finalized), null);
  assert.equal(toRideProgressView(finalized, preview.room, now), null);
  for (const patch of [
    { partyId: "other" },
    { routeVersion: 99 },
    { finalizedAt: null },
    { finalizedAt: "invalid" },
    { status: "ESTIMATED" },
  ]) {
    const changed = {
      ...finalized,
      settlement: { ...finalized.settlement, ...patch },
    };
    assert.equal(isHomeRideFinalized(changed), false);
    assert.equal(getHomeRideParty(changed)?.id, data.party.id);
  }
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
