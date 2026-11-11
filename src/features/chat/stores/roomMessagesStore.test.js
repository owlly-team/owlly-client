import assert from "node:assert/strict";
import { test } from "node:test";
import { useRoomMessagesStore } from "./roomMessagesStore.js";

test("returning to a room keeps previous messages and appends taxi notices after them", () => {
  const scope = "preview:history-test";
  const initial = [{ id: "1", body: "정문 앞이에요" }];
  const sent = { id: "2", body: "곧 도착해요" };
  const notice = { id: "3", messageType: "SYSTEM", body: "택시를 불렀어요" };
  useRoomMessagesStore.getState().appendMessage(scope, initial, sent);
  // 다른 화면으로 이동했다 돌아온 소비자가 초기 내역을 다시 전달해도 기존 대화를 유지한다.
  useRoomMessagesStore.getState().appendMessage(scope, initial, notice);
  assert.deepEqual(useRoomMessagesStore.getState().messagesByRoom[scope], [...initial, sent, notice]);
  assert.deepEqual(initial, [{ id: "1", body: "정문 앞이에요" }]);
});

test("messages stay separate for different rooms and preview/live contexts", () => {
  const append = useRoomMessagesStore.getState().appendMessage;
  append("preview:isolation-a", [], { id: "a" });
  append("preview:isolation-b", [], { id: "b" });
  append("live:isolation-a", [], { id: "c" });
  const rooms = useRoomMessagesStore.getState().messagesByRoom;
  assert.deepEqual(rooms["preview:isolation-a"], [{ id: "a" }]);
  assert.deepEqual(rooms["preview:isolation-b"], [{ id: "b" }]);
  assert.deepEqual(rooms["live:isolation-a"], [{ id: "c" }]);
});
