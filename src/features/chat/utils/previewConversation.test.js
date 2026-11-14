import test from "node:test";
import assert from "node:assert/strict";
import {
  createPreviewConversation,
  schedulePreviewConversation,
} from "./previewConversation.js";
import { chatRoomMockData } from "../mocks/chatRoomMockData.js";
import { useRoomMessagesStore as store } from "../stores/roomMessagesStore.js";
import { toChatBubble } from "./chatMessageUtils.js";

const room = chatRoomMockData.room;
const members = chatRoomMockData.context.party.members;
const previewNow = Date.parse("2026-11-09T23:00:00+09:00");
const conversationFor = (myMemberId) =>
  createPreviewConversation({ room, members, myMemberId, previewNow });

function fakeClock() {
  let current = 1000;
  let id = 0;
  const timers = new Map();
  return {
    now: () => current,
    schedule: (callback, delay) => {
      const handle = ++id;
      timers.set(handle, { callback, due: current + delay });
      return handle;
    },
    cancel: (handle) => timers.delete(handle),
    advance: (elapsed) => {
      current += elapsed;
      for (const [handle, timer] of [...timers].sort(
        (a, b) => a[1].due - b[1].due,
      )) {
        if (timer.due <= current && timers.delete(handle)) timer.callback();
      }
    },
    timers,
  };
}

for (const myMemberId of ["502", "503"]) {
  test(`${myMemberId}: old and automatically received messages never appear as the user's own messages`, () => {
    const original = structuredClone(chatRoomMockData.messages);
    const conversation = conversationFor(myMemberId);
    assert.ok(
      conversation.initialMessages.some(
        (message) => message.messageType === "USER",
      ),
    );
    const context = { party: { myMemberId, members } };
    for (const message of conversation.initialMessages) {
      assert.notEqual(toChatBubble(message, context).variant, "outgoing");
      assert.ok(Date.parse(message.createdAt) < previewNow);
    }
    assert.deepEqual(
      conversation.deliveries.map((item) => item.afterMs),
      [3000, 7000, 11000],
    );
    for (const delivery of conversation.deliveries)
      assert.notEqual(delivery.senderMemberId, myMemberId);
    assert.deepEqual(chatRoomMockData.messages, original);
  });
}

test("timed incoming messages preserve manually sent messages and resume without replay after leaving", () => {
  const scope = "preview:601:502";
  store.getState().resetPreview();
  const clock = fakeClock();
  const conversation = conversationFor("502");
  let cleanup = schedulePreviewConversation({
    room,
    scope,
    conversation,
    store,
    ...clock,
  });
  const initialCount = conversation.initialMessages.length;
  assert.equal(store.getState().messagesByRoom[scope].length, initialCount);
  clock.advance(2999);
  assert.equal(store.getState().messagesByRoom[scope].length, initialCount);
  clock.advance(1);
  assert.equal(store.getState().messagesByRoom[scope].length, initialCount + 1);
  const mine = {
    id: "actually-typed",
    senderMemberId: "502",
    messageType: "USER",
    body: "저도 도착했어요",
  };
  store.getState().appendMessage(scope, [], mine);
  cleanup();
  clock.advance(8000);
  assert.equal(store.getState().messagesByRoom[scope].length, initialCount + 2);
  cleanup = schedulePreviewConversation({
    room,
    scope,
    conversation,
    store,
    ...clock,
  });
  clock.advance(0);
  const messages = store.getState().messagesByRoom[scope];
  assert.equal(messages.length, initialCount + 4);
  assert.deepEqual(
    messages.filter((message) => message.senderMemberId === "502"),
    [mine],
  );
  assert.equal(
    toChatBubble(mine, { party: { myMemberId: "502", members } }).variant,
    "outgoing",
  );
  assert.equal(
    new Set(messages.map((message) => message.id)).size,
    messages.length,
  );
  cleanup();
});

test("StrictMode effect replay creates one conversation; reset cancels stale deliveries and keeps live data", () => {
  const scope = "preview:601:503";
  store.getState().resetPreview();
  const clock = fakeClock();
  const conversation = conversationFor("503");
  const options = { room, scope, conversation, store, ...clock };
  schedulePreviewConversation(options)();
  const cleanup = schedulePreviewConversation(options);
  clock.advance(11000);
  const messages = store.getState().messagesByRoom[scope];
  assert.equal(messages.length, conversation.initialMessages.length + 3);
  assert.equal(
    new Set(messages.map((message) => message.id)).size,
    messages.length,
  );
  cleanup();
  store.getState().resetPreview();
  store.getState().appendMessage("live:protected", [], { id: "live-message" });
  schedulePreviewConversation(options);
  assert.equal(clock.timers.size, 3);
  store.getState().resetPreview();
  clock.advance(11000);
  assert.equal(store.getState().messagesByRoom[scope], undefined);
  assert.deepEqual(store.getState().messagesByRoom["live:protected"], [
    { id: "live-message" },
  ]);
});

test("roles, other rooms, closed rooms and inactive members cannot leak seeded messages", () => {
  store.getState().resetPreview();
  const clock = fakeClock();
  for (const candidate of [
    { ...room, status: "CLOSED" },
    { ...room, canSendMessage: false },
  ]) {
    schedulePreviewConversation({
      room: candidate,
      scope: "preview:closed",
      conversation: conversationFor("502"),
      store,
      ...clock,
    });
  }
  assert.equal(clock.timers.size, 0);
  const unknown = createPreviewConversation({
    room: { ...room, id: "999" },
    members,
    myMemberId: "502",
  });
  assert.deepEqual(unknown, { initialMessages: [], deliveries: [] });
  const withoutOthers = createPreviewConversation({
    room,
    members: members.map((member) =>
      member.memberId === "502" ? member : { ...member, decision: "LEFT" },
    ),
    myMemberId: "502",
  });
  assert.equal(
    withoutOthers.initialMessages.filter(
      (message) => message.messageType === "USER",
    ).length,
    0,
  );
  assert.equal(withoutOthers.deliveries.length, 0);
  schedulePreviewConversation({
    room,
    scope: "preview:601:502",
    conversation: conversationFor("502"),
    store,
    ...clock,
  });
  schedulePreviewConversation({
    room,
    scope: "preview:601:503",
    conversation: conversationFor("503"),
    store,
    ...clock,
  });
  clock.advance(11000);
  for (const myMemberId of ["502", "503"])
    assert.ok(
      store
        .getState()
        .messagesByRoom[`preview:601:${myMemberId}`].every(
          (message) => message.senderMemberId !== myMemberId,
        ),
    );
});
