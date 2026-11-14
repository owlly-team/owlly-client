import test from "node:test";
import assert from "node:assert/strict";
import {
  createDemoSession,
  registerDemo,
  matchDemo,
  cancelDemo,
  updateDemoParty,
  prepayDemo,
  finalizeDemoSettlement,
  DEMO_WAIT_MS,
} from "./demoFlow.js";
import { createMockRegistration } from "../matching/mocks/matchingMockData.js";
import { resolveChatRoom } from "../chat/utils/chatRoomUtils.js";
import { getRoomPhase } from "../chat/utils/prepayUtils.js";
import {
  resolveRepresentativeSettlement,
  toRepresentativeRefundView,
} from "../settlement/utils/representativeSettlementUtils.js";
import { toMemberSettlementView } from "../settlement/utils/memberSettlementUtils.js";

function register(role) {
  const session = createDemoSession(role);
  const selection = {
    pickupPoint: session.home.pickupPoint,
    destination: {
      id: "99",
      name: "오늘 하차 지점",
      districtId: "21",
      districtName: "영통구",
    },
    sameGenderOnly: false,
  };
  const registration = createMockRegistration(
    { departureAt: "2026-11-10T00:00:00+09:00", waitingCount: 2 },
    selection,
  );
  return registerDemo(session, registration, selection, 100);
}

for (const role of ["member", "representative"]) {
  test(`${role}: registration, home, matching, chat and settlement share one journey`, () => {
    let session = register(role);
    assert.equal(session.home.rideRequest.status, "WAITING");
    assert.equal(session.matchAt, 100 + DEMO_WAIT_MS);
    session = matchDemo(session);
    const result = session.matchingResult;
    assert.equal(result.party.departureAt, "2026-11-10T00:00:00+09:00");
    assert.equal(result.rideRequest.sameGenderOnly, false);
    assert.equal(
      result.party.members.find(
        (item) => item.memberId === result.party.myMemberId,
      ).destinationDongName,
      "오늘 하차 지점",
    );
    assert.equal(
      result.party.myMemberId === result.party.representativeMemberId,
      role === "representative",
    );
    assert.equal(session.registration.rideRequest.status, "MATCHED");
    const party = {
      ...result.party,
      status: "PREPAYING",
      members: result.party.members.map((item) => ({
        ...item,
        decision: "ACCEPTED",
      })),
    };
    session = updateDemoParty(session, party);
    let room = resolveChatRoom({
      roomId: party.roomId,
      state: {
        isPreview: true,
        demoSession: true,
        matchingResult: session.matchingResult,
        previewNow: session.home.previewNow,
      },
    });
    assert.equal(room.context.party.departureAt, party.departureAt);
    assert.equal(getRoomPhase(party, room.previewNow), "chat");
    session = prepayDemo(session);
    room = resolveChatRoom({
      roomId: party.roomId,
      state: {
        isPreview: true,
        demoSession: true,
        matchingResult: session.matchingResult,
        previewNow: session.home.previewNow,
      },
    });
    assert.equal(getRoomPhase(party, room.previewNow), "prepay");
    assert.equal(
      resolveChatRoom({
        roomId: "wrong-room",
        state: { isPreview: true, matchingResult: result },
      }),
      null,
    );
    const settlement = finalizeDemoSettlement(session.matchingResult, 20001);
    assert.equal(
      settlement.items.reduce((sum, item) => sum + item.actualShareWon, 0),
      20001,
    );
    if (role === "representative") {
      const resolved = resolveRepresentativeSettlement({
        partyId: party.id,
        allowPreview: true,
        state: { isPreview: true, settlement, matchingResult: { party } },
      });
      assert.ok(resolved.data);
      assert.ok(toRepresentativeRefundView(settlement, party.id, { party }));
    } else {
      assert.ok(toMemberSettlementView(settlement, party.id, { party }));
    }
  });
}

test("cancellation prevents delayed matching; restarting clears previous journey and preserves fixtures", () => {
  const original = createDemoSession();
  const waiting = register("member");
  assert.equal(matchDemo(cancelDemo(waiting)).matchingResult, null);
  assert.equal(cancelDemo(waiting).matchAt, null);
  assert.equal(original.home.rideRequest, null);
  const matched = matchDemo(waiting);
  assert.equal(updateDemoParty(matched, { id: "other-party" }), matched);
  const restarted = createDemoSession("representative", "afterLastTransit");
  assert.equal(restarted.home.travelOptions.transit.available, false);
  assert.equal(restarted.matchingResult, null);
});

test("demo allocation is a valid final settlement and rejects invalid amounts", () => {
  const context = matchDemo(register("representative")).matchingResult;
  for (const amount of [0, -1, NaN, 2.5])
    assert.equal(finalizeDemoSettlement(context, amount), null);
  const settlement = finalizeDemoSettlement(context, 20300, [
    "502",
    "501",
    "503",
  ]);
  assert.equal(
    settlement.items.find((item) => item.memberId === "502").actualShareWon,
    4500,
  );
  assert.equal(
    settlement.items.find((item) => item.memberId === "501").actualShareWon,
    7900,
  );
  assert.equal(
    settlement.items.find((item) => item.isRepresentative).refundDueWon,
    0,
  );
  assert.equal(context.settlement.actualTotalWon, null);
});
