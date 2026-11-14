import test from "node:test";
import assert from "node:assert/strict";
import {
  applyMessagePage,
  compareMessageIds,
  createMessageCommand,
  isRoomAccessError,
  mergeMessages,
  validateMessage,
  validateMessagePage,
} from "./messageFlow.js";
const message = (id, roomId = "601") => ({
  id,
  roomId,
  senderMemberId: "501",
  messageType: "USER",
  body: "가려진 번호",
  createdAt: "2026-11-14T14:20:00Z",
});
const page = (ids, meta) => ({ data: ids.map((id) => message(id)), meta });

test("빈 신규 응답과 과거 조회는 신규 커서를 유지하고 신규 연속 페이지도 과거 커서를 유지한다", () => {
  let state = applyMessagePage(
    { messages: [], latestId: null, beforeId: null, loaded: false },
    {
      messages: [message("20")],
      latestId: "20",
      nextBeforeId: "20",
      hasMore: true,
    },
  );
  state = applyMessagePage(
    state,
    { messages: [], latestId: null, nextBeforeId: null, hasMore: false },
    { afterId: "20" },
  );
  assert.equal(state.latestId, "20");
  assert.equal(state.beforeId, "20");
  state = applyMessagePage(
    state,
    {
      messages: [message("21")],
      latestId: "21",
      nextBeforeId: null,
      hasMore: true,
    },
    { afterId: "20" },
  );
  assert.equal(state.latestId, "21");
  assert.equal(state.beforeId, "20");
  state = applyMessagePage(
    state,
    {
      messages: [message("19")],
      latestId: "19",
      nextBeforeId: "19",
      hasMore: true,
    },
    { beforeId: "20" },
  );
  assert.equal(state.latestId, "21");
  assert.equal(state.beforeId, "19");
  assert.deepEqual(
    state.messages.map((m) => m.id),
    ["19", "20", "21"],
  );
});

test("최초/이전 내림차순 및 신규 오름차순 결과를 중복 없이 표시하고 큰 ID를 보존한다", () => {
  const initial = validateMessagePage(
    page(["90071992547409931", "90071992547409930"], {
      latestId: "90071992547409931",
      nextBeforeId: "90071992547409930",
      hasMore: true,
    }),
    "601",
  );
  const older = validateMessagePage(
    page(["10", "9"], { latestId: "10", nextBeforeId: null, hasMore: false }),
    "601",
    { beforeId: "90071992547409930" },
  );
  const newer = validateMessagePage(
    page(["90071992547409932"], {
      latestId: "90071992547409932",
      nextBeforeId: null,
      hasMore: false,
    }),
    "601",
    { afterId: initial.latestId },
  );
  assert.deepEqual(
    mergeMessages(mergeMessages(initial.messages, older.messages), [
      ...initial.messages,
      ...newer.messages,
    ]).map((m) => m.id),
    ["9", "10", "90071992547409930", "90071992547409931", "90071992547409932"],
  );
  assert.equal(compareMessageIds("9", "10") < 0, true);
  assert.equal(
    validateMessagePage(
      page([], { latestId: null, nextBeforeId: null, hasMore: false }),
      "601",
      { afterId: newer.latestId },
    ).latestId,
    null,
  );
});

test("다른 방·잘못된 메타·진행하지 않는 신규 커서는 수용하지 않는다", () => {
  assert.throws(() => validateMessage(message("1", "other"), "601"));
  for (const response of [
    page(["1"], { latestId: "2", nextBeforeId: null, hasMore: false }),
    page([], { latestId: null, nextBeforeId: null, hasMore: true }),
    page(["1", "1"], { latestId: "1", nextBeforeId: null, hasMore: false }),
  ])
    assert.throws(() => validateMessagePage(response, "601"));
  assert.throws(() =>
    validateMessagePage(
      page(["1"], { latestId: "1", nextBeforeId: null, hasMore: true }),
      "601",
      { afterId: "1" },
    ),
  );
});

test("새 전송은 UUID 두 개와 원문만 생성하며 200자 및 JS 문자열 길이로 제한한다", () => {
  let count = 0;
  const command = createMessageCommand(
    "  0042 확인해 주세요  ",
    () => `uuid-${++count}`,
  );
  assert.deepEqual(command, {
    body: { clientMessageId: "uuid-1", text: "  0042 확인해 주세요  " },
    key: "uuid-2",
  });
  assert.doesNotThrow(() => createMessageCommand("가".repeat(200)));
  assert.doesNotThrow(() => createMessageCommand("😀".repeat(100)));
  for (const text of [" ", "가".repeat(201), "😀".repeat(101), null])
    assert.throws(() => createMessageCommand(text));
});

test("SYSTEM은 서버 응답만 표시하며 접근 종료 오류는 일반 조회 오류와 구분한다", () => {
  assert.equal(
    validateMessage(
      { ...message("1"), messageType: "SYSTEM", senderMemberId: null },
      "601",
    ).messageType,
    "SYSTEM",
  );
  assert.throws(() =>
    validateMessage({ ...message("1"), messageType: "SYSTEM" }, "601"),
  );
  for (const error of [
    { status: 401 },
    { status: 403 },
    { status: 404 },
    { status: 410 },
    { status: 409, code: "ROOM_CLOSED" },
    { code: "ROOM_NOT_READY" },
  ])
    assert.equal(isRoomAccessError(error), true);
  assert.equal(isRoomAccessError({ status: 429 }), false);
  assert.equal(isRoomAccessError({ status: 500 }), false);
});
