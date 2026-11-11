import test from "node:test";
import assert from "node:assert/strict";
import { getChatRoomView, resolveChatRoom } from "./chatRoomUtils.js";

import { chatRoomMockData, getMockChatRoom } from "../mocks/chatRoomMockData.js";
import { mockRepresentativeMatchingResult } from "../../matching/mocks/matchingMockData.js";

const { room, context } = chatRoomMockData;
const now = Date.parse("2026-11-05T23:20:00+09:00");

test("all preview routes use the configured clock and recompute leave actions after clock changes", () => {
  const originalNow = chatRoomMockData.previewNow;
  try {
    for (const previewMember of [false, true]) {
      for (const [time, canLeave] of [["23:10:00", true], ["23:15:00", true], ["23:15:01", false]]) {
        chatRoomMockData.previewNow = `2026-11-05T${time}+09:00`;
        const direct = resolveChatRoom({ roomId: "601", demo: mockRepresentativeMatchingResult, previewMember });
        const restored = resolveChatRoom({ roomId: "601", state: { isPreview: true,
          matchingResult: direct.context, previewNow: 0 } });
        for (const preview of [direct, restored, resolveChatRoom({ partyId: "401" })]) {
          assert.equal(preview.previewNow, Date.parse(chatRoomMockData.previewNow));
          assert.equal(getChatRoomView(preview.room, preview.context, preview.previewNow).canLeave, canLeave);
        }
        assert.equal(direct.context.party.myMemberId, previewMember ? "502" : "503");
      }
    }
    assert.deepEqual(mockRepresentativeMatchingResult.party.allowedActions, []);
  } finally {
    chatRoomMockData.previewNow = originalNow;
  }
});

test("matching previews restore the meeting code, including room state saved before the fix", () => {
  const matchingResult = { ...context, party: { ...context.party, roomId: room.id } };
  const state = { matchingResult, isPreview: true };
  const preview = resolveChatRoom({ roomId: "601", state });
  assert.equal(getChatRoomView(preview.room, preview.context, now).verificationCode, "4821");
  const oldRoom = { ...room };
  delete oldRoom.verificationCode;
  const restored = resolveChatRoom({ roomId: "601", state: { ...state, room: oldRoom } });
  assert.equal(restored.room.verificationCode, "4821");
  const explicitMissing = resolveChatRoom({ roomId: "601", state: { ...state, room: { ...room, verificationCode: null } } });
  assert.equal(explicitMissing.room.verificationCode, null);
});

test("both room URLs resolve the same supplied party and room without mock overrides", () => {
  const matchingResult = { ...context, party: { ...context.party, roomId: room.id, allowedActions: [] } };
  const state = { matchingResult, room, isPreview: false };
  const byRoom = resolveChatRoom({ roomId: room.id, state });
  const byParty = resolveChatRoom({ partyId: room.partyId, state });
  assert.deepEqual(byRoom, byParty);
  assert.deepEqual(byRoom.context.party.allowedActions, []);
  assert.equal(byRoom.isPreview, false);
  assert.equal(byRoom.room.verificationCode, "4821");
});

test("legacy previews keep meeting metadata and time after boarding and report navigation", () => {
  const first = resolveChatRoom({ partyId: "401" });
  assert.equal(first.isPreview, true);
  assert.equal(first.context.party.roomId, "601");
  const updated = { ...first.context, partyEtag: '"party-2"', party: { ...first.context.party, status: "RIDING",
    members: first.context.party.members.map((member) => member.memberId === first.context.party.myMemberId
      ? { ...member, boardingStatus: "BOARDED" } : member) } };
  const restored = resolveChatRoom({ partyId: "401", state: {
    matchingResult: updated, room: first.room, isPreview: true, previewNow: first.previewNow,
    boardingStarted: true, reportPreview: true,
  } });
  assert.deepEqual(restored.context, updated);
  assert.equal(restored.previewNow, first.previewNow);
  assert.equal(restored.room.verificationCode, "4821");
});

test("unknown or mismatched URLs and room metadata never open a different room", () => {
  const state = { matchingResult: { ...context, party: { ...context.party, roomId: "601" } }, room, isPreview: false };
  assert.equal(resolveChatRoom({ roomId: "999", state }), null);
  assert.equal(resolveChatRoom({ partyId: "999", state }), null);
  assert.equal(resolveChatRoom({ partyId: "999" }), null);
  assert.equal(resolveChatRoom({ roomId: "601", state: { ...state, room: { ...room, partyId: "999" } } }), null);
  assert.equal(resolveChatRoom({ roomId: "601" }), null);
});

test("closed rooms stay closed and missing verification codes are not taken from mocks", () => {
  const matchingResult = { ...context, party: { ...context.party, roomId: room.id } };
  const closed = resolveChatRoom({ roomId: "601", state: { matchingResult, isPreview: true,
    room: { ...room, status: "CLOSED" } } });
  assert.equal(getChatRoomView(closed.room, closed.context, now).canCompose, false);
  const withoutMetadata = resolveChatRoom({ roomId: "601", state: { matchingResult, isPreview: false } });
  assert.equal(getChatRoomView(withoutMetadata.room, withoutMetadata.context, now).verificationCode, null);
  assert.equal(withoutMetadata.room.canSendMessage, false);
});

test("room view uses matching context and API-27 meeting data", () => {
  const view = getChatRoomView(room, context, now);
  assert.equal(view.title, "정문 → 영통구 · 3명");
  assert.equal(view.timingLabel, "집결까지 10분");
  assert.equal(view.verificationCode, "4821");
  assert.equal(view.representativeName, "이*준");
  assert.equal(view.canCompose, true);
  assert.equal(getChatRoomView(room, context, Date.parse(room.departureAt)).timingLabel, "집결 시간이 됐어요");
});

test("closed rooms cannot compose and never display the verification code", () => {
  const view = getChatRoomView({ ...room, status: "CLOSED", canSendMessage: true }, context, now);
  assert.equal(view.closed, true);
  assert.equal(view.canCompose, false);
  assert.equal(view.verificationCode, null);
  assert.equal(getChatRoomView({ ...room, canSendMessage: false }, context, now).canCompose, false);
});

test("leaving is enabled through the exact 15-minute departure cutoff", () => {
  const deadline = Date.parse(room.departureAt) - 15 * 60000;
  assert.equal(getChatRoomView(room, context, deadline - 1).canLeave, true);
  assert.equal(getChatRoomView(room, context, deadline).canLeave, true);
  assert.equal(getChatRoomView(room, context, deadline + 1).canLeave, false);
  assert.equal(getChatRoomView({ ...room, status: "CLOSED" }, context, deadline - 1).canLeave, false);
  assert.equal(getChatRoomView(room, { ...context, party: { ...context.party, departureAt: null } }, deadline - 1).canLeave, false);
});

test("mock time enables leave even when matching context has stale empty actions", () => {
  const matchingContext = { ...context, party: { ...context.party, myMemberId: "503", allowedActions: [] } };
  const preview = getMockChatRoom("401", matchingContext, Date.parse("2026-11-05T23:00:00+09:00"));
  assert.equal(preview.context.party.myMemberId, "503");
  assert.equal(getChatRoomView(preview.room, preview.context, preview.now).canLeave, true);
  assert.deepEqual(matchingContext.party.allowedActions, []);
  const latePreview = getMockChatRoom("401", matchingContext, Date.parse("2026-11-05T23:16:00+09:00"));
  assert.equal(getChatRoomView(latePreview.room, latePreview.context, latePreview.now).canLeave, false);
});

test("mock time does not enable leave when a member has already sent funds", () => {
  const withTransfer = { ...context, settlement: { partyId: "401", items: [{ transfers: [
    { payerMemberId: "502", payeeMemberId: "503", status: "SENT" },
  ] }] } };
  const preview = getMockChatRoom("401", withTransfer, Date.parse("2026-11-05T23:00:00+09:00"));
  assert.equal(getChatRoomView(preview.room, preview.context, preview.now).canLeave, false);
});

test("missing codes, missing metadata, and unrelated parties never fabricate meeting details", () => {
  const view = getChatRoomView({ ...room, verificationCode: null }, undefined, now);
  assert.equal(view.verificationCode, null);
  assert.equal(view.title, "팟 채팅방");
  assert.equal(view.memberCount, null);
  assert.equal(view.representativeName, undefined);
  assert.equal(getChatRoomView({ ...room, verificationCode: "0042" }, context, now).verificationCode, "0042");
  assert.equal(getChatRoomView(room, { ...context, party: { ...context.party, id: "999" } }, now).title, "팟 채팅방");
});

