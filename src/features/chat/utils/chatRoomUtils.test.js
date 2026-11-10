import test from "node:test";
import assert from "node:assert/strict";
import { getChatRoomView } from "./chatRoomUtils.js";

import { chatRoomMockData, getMockChatRoom } from "../mocks/chatRoomMockData.js";

const { room, context } = chatRoomMockData;
const now = Date.parse("2026-11-05T23:20:00+09:00");

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

