import test from "node:test";
import assert from "node:assert/strict";
import {
  createReportBody,
  getReportTargets,
  reportErrorMessage,
  submitReport,
} from "./reportFlow.js";
const party = {
  id: "401",
  myMemberId: "501",
  members: [
    { memberId: "501", decision: "ACCEPTED" },
    { memberId: "502", decision: "LEFT" },
  ],
};
const room = { id: "601", partyId: "401", status: "OPEN" };
const input = { party, room, targetMemberId: "502", reasonCode: "OTHER" };

test("신고는 이탈한 같은 팟 멤버도 가능하고 OTHER의 설명은 선택이다", () => {
  assert.deepEqual(
    getReportTargets(party).map((member) => member.memberId),
    ["502"],
  );
  assert.deepEqual(createReportBody(input), {
    targetMemberId: "502",
    reasonCode: "OTHER",
  });
  assert.equal(
    createReportBody({ ...input, details: "가".repeat(200) }).details.length,
    200,
  );
  assert.throws(() =>
    createReportBody({ ...input, details: "😀".repeat(101) }),
  );
});

test("본인·타 팟·잘못된 사유·bigint 범위 초과·다른 방 메시지는 전송하지 않는다", () => {
  for (const override of [
    { targetMemberId: "501" },
    { targetMemberId: "999" },
    { targetMemberId: "9223372036854775808" },
    { reasonCode: "INVALID" },
    { room: { ...room, partyId: "other" } },
    { room: { ...room, status: "CLOSED" } },
    {
      message: {
        id: "702",
        roomId: "other",
        senderMemberId: "502",
        messageType: "USER",
      },
    },
  ])
    assert.throws(() => createReportBody({ ...input, ...override }));
  assert.equal(
    createReportBody({
      ...input,
      message: {
        id: "702",
        roomId: "601",
        senderMemberId: "502",
        messageType: "USER",
      },
    }).messageId,
    "702",
  );
});

test("서버 접수·차단·삭제 예정 응답을 확인하며 중복 신고를 성공으로 처리하지 않는다", async () => {
  const body = createReportBody(input);
  const data = {
    id: "801",
    status: "RECEIVED",
    rematchingBlocked: true,
    evidenceDeleteAfter: "2026-11-21T11:00:00+09:00",
  };
  assert.equal(
    await submitReport(
      { report: async () => ({ data }) },
      room.id,
      body,
      "key",
    ),
    data,
  );
  for (const invalid of [
    { ...data, rematchingBlocked: false },
    { ...data, status: "DISMISSED" },
    { ...data, evidenceDeleteAfter: null },
  ])
    await assert.rejects(
      submitReport(
        { report: async () => ({ data: invalid }) },
        room.id,
        body,
        "key",
      ),
    );
  const error = Object.assign(new Error("duplicate"), {
    code: "REPORT_ALREADY_EXISTS",
    status: 409,
  });
  await assert.rejects(
    submitReport(
      {
        report: async () => {
          throw error;
        },
      },
      room.id,
      body,
      "key",
    ),
    (failure) => failure === error,
  );
  assert.equal(reportErrorMessage(error), "이미 신고한 멤버예요.");
});
