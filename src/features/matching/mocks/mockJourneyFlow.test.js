import test from "node:test";
import assert from "node:assert/strict";
import {
  createMockJourney,
  registerMockJourney,
  matchMockJourney,
  cancelMockJourney,
  updateMockParty,
  prepayMockJourney,
  finalizeMockSettlement,
  resolveMockPickup,
  scheduleMockMatching,
  MOCK_MATCH_DELAY_MS,
} from "./mockJourneyFlow.js";
import { createMockRegistration } from "./matchingMockData.js";
import { resolveChatRoom } from "../../chat/utils/chatRoomUtils.js";
import { getRoomPhase } from "../../chat/utils/prepayUtils.js";
import {
  resolveRepresentativeSettlement,
  toRepresentativeRefundView,
} from "../../settlement/utils/representativeSettlementUtils.js";
import { toMemberSettlementView } from "../../settlement/utils/memberSettlementUtils.js";
import { useMockJourneyStore } from "../stores/mockJourneyStore.js";
import { useRoomMessagesStore } from "../../chat/stores/roomMessagesStore.js";

function register(role) {
  const session = createMockJourney(role);
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
  return registerMockJourney(session, registration, selection, 100);
}

test("a new manual registration clears the previous mock room history without starting matching by itself", () => {
  const stored = register("representative");
  useRoomMessagesStore
    .getState()
    .appendMessage("preview:601:503", [], {
      id: "old-own-message",
      senderMemberId: "503",
    });
  useMockJourneyStore
    .getState()
    .register(stored.registration, { pickupPoint: stored.home.pickupPoint });
  assert.equal(
    useRoomMessagesStore.getState().messagesByRoom["preview:601:503"],
    undefined,
  );
  assert.equal(
    useMockJourneyStore.getState().journey.home.rideRequest.status,
    "WAITING",
  );
  useMockJourneyStore.getState().clear();
});

test("matching only advances while the waiting screen owns its timer and ignores an old request", () => {
  let journey = register("member");
  let timer;
  let cancelled;
  let scheduled = 0;
  const store = {
    getState: () => ({
      journey,
      match: () => {
        journey = matchMockJourney(journey);
      },
    }),
  };
  const options = {
    id: journey.home.rideRequest.id,
    status: "WAITING",
    store,
    schedule: (callback, delay) => {
      scheduled++;
      assert.equal(delay, MOCK_MATCH_DELAY_MS);
      timer = callback;
      return 1;
    },
    cancel: (handle) => {
      cancelled = handle;
    },
  };
  scheduleMockMatching({ ...options, enabled: false });
  assert.equal(scheduled, 0);
  assert.equal(journey.home.rideRequest.status, "WAITING");
  const cleanup = scheduleMockMatching({ ...options, enabled: true });
  assert.equal(journey.home.rideRequest.status, "WAITING");
  timer();
  assert.equal(journey.home.rideRequest.status, "MATCHED");
  cleanup();
  assert.equal(cancelled, 1);
  journey = register("member");
  scheduleMockMatching({ ...options, enabled: true });
  journey = {
    ...journey,
    home: {
      ...journey.home,
      rideRequest: { ...journey.home.rideRequest, id: "new-request" },
    },
  };
  timer();
  assert.equal(journey.home.rideRequest.status, "WAITING");
});

test("Kakao search replaces stale preview coordinates throughout the same journey only", () => {
  let session = matchMockJourney(register("member"));
  const point = {
    ...session.home.pickupPoint,
    point: { latitude: 37.3, longitude: 127.1 },
  };
  session = resolveMockPickup(session, point);
  assert.deepEqual(session.home.pickupPoint, point);
  assert.deepEqual(session.home.party.pickupPoint, point);
  assert.deepEqual(session.registration.pickupPoint, point);
  assert.deepEqual(session.matchingResult.party.pickupPoint, point);
  assert.equal(session.matchingResult.party.myMemberId, "502");
  assert.equal(resolveMockPickup(session, { ...point, id: "other" }), session);
  assert.equal(resolveMockPickup(session, { ...point, point: null }), session);
  assert.equal(createMockJourney().home.pickupPoint.point, null);
});

for (const role of ["member", "representative"]) {
  test(`${role}: registration, home, matching, chat and settlement share one journey`, () => {
    let session = register(role);
    assert.equal(session.home.rideRequest.status, "WAITING");
    session = matchMockJourney(session);
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
    session = updateMockParty(session, party);
    let room = resolveChatRoom({
      roomId: party.roomId,
      state: {
        isPreview: true,
        mockClock: true,
        matchingResult: session.matchingResult,
        previewNow: session.home.previewNow,
      },
    });
    assert.equal(room.context.party.departureAt, party.departureAt);
    assert.equal(getRoomPhase(party, room.previewNow), "chat");
    session = prepayMockJourney(session);
    room = resolveChatRoom({
      roomId: party.roomId,
      state: {
        isPreview: true,
        mockClock: true,
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
    const settlement = finalizeMockSettlement(session.matchingResult, 20001);
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
  const original = createMockJourney();
  const waiting = register("member");
  assert.equal(
    matchMockJourney(cancelMockJourney(waiting)).matchingResult,
    null,
  );
  assert.equal(original.home.rideRequest, null);
  const matched = matchMockJourney(waiting);
  assert.equal(updateMockParty(matched, { id: "other-party" }), matched);
  const restarted = createMockJourney("representative", "afterLastTransit");
  assert.equal(restarted.home.travelOptions.transit.available, false);
  assert.equal(restarted.matchingResult, null);
});

test("demo allocation is a valid final settlement and rejects invalid amounts", () => {
  const context = matchMockJourney(register("representative")).matchingResult;
  for (const amount of [0, -1, NaN, 2.5])
    assert.equal(finalizeMockSettlement(context, amount), null);
  const settlement = finalizeMockSettlement(context, 20300, [
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
