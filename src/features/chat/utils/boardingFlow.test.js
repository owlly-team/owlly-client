import test from "node:test";
import assert from "node:assert/strict";
import { getBoardingState, recordBoarding } from "./boardingFlow.js";
const party = {
  id: "401",
  myMemberId: "501",
  representativeMemberId: "503",
  status: "PREPAYING",
  departureAt: "2026-11-14T23:30:00+09:00",
  allowedActions: ["RECORD_BOARDING"],
  members: [
    { memberId: "501", decision: "ACCEPTED", boardingStatus: "UNKNOWN" },
  ],
};
const departure = Date.parse(party.departureAt);

test("출발 15분 전과 1시간 후 경계를 포함하며 확정·팟 상태·allowedActions를 함께 검사한다", () => {
  for (const now of [departure - 15 * 60000, departure, departure + 60 * 60000])
    assert.equal(getBoardingState(party, now).canRecord, true);
  for (const now of [departure - 15 * 60000 - 1, departure + 60 * 60000 + 1])
    assert.equal(getBoardingState(party, now).canRecord, false);
  for (const data of [
    { ...party, allowedActions: [] },
    { ...party, status: "CANCELLED" },
    { ...party, members: [{ ...party.members[0], decision: "PENDING" }] },
  ])
    assert.equal(getBoardingState(data, departure).canRecord, false);
});

test("BOARDED는 서버 RIDING·ETag를 반영하고 MISSED는 팟 상태를 임의 변경하지 않는다", async () => {
  for (const status of ["BOARDED", "MISSED"]) {
    const updated = {
      ...party,
      status: status === "BOARDED" ? "RIDING" : "PREPAYING",
      members: [{ ...party.members[0], boardingStatus: status }],
    };
    const result = await recordBoarding(
      {
        confirmBoarding: async (...args) => {
          assert.deepEqual(args, ["401", status, "same-key"]);
          return { data: updated, etag: '"v2"' };
        },
      },
      { party },
      status,
      "same-key",
      departure,
    );
    assert.equal(result.party, updated);
    assert.equal(result.etag, '"v2"');
    const context = { party: updated, etag: '"v2"' };
    assert.equal(
      await recordBoarding({}, context, status, "unused", departure + 7200000),
      context,
    );
    await assert.rejects(
      recordBoarding(
        {},
        context,
        status === "BOARDED" ? "MISSED" : "BOARDED",
        "unused",
        departure,
      ),
      { code: "BOARDING_ALREADY_RECORDED" },
    );
  }
});

test("다른 팟·멤버·기록되지 않은 응답을 성공으로 처리하지 않는다", async () => {
  for (const data of [
    { ...party, id: "other" },
    { ...party, myMemberId: "other" },
    party,
  ])
    await assert.rejects(
      recordBoarding(
        { confirmBoarding: async () => ({ data }) },
        { party },
        "BOARDED",
        "key",
        departure,
      ),
    );
});

test("탑승 기록 재시도 응답이 정산 단계로 진행됐어도 본인 BOARDED를 반영한다", async () => {
  for (const status of ["SETTLING", "COMPLETED"]) {
    const updated = {
      ...party,
      status,
      allowedActions: [],
      members: [{ ...party.members[0], boardingStatus: "BOARDED" }],
    };
    const result = await recordBoarding(
      { confirmBoarding: async () => ({ data: updated, etag: '"v3"' }) },
      { party },
      "BOARDED",
      "retry-key",
      departure,
    );
    assert.equal(result.party, updated);
    assert.equal(result.etag, '"v3"');
  }
});

test("BOARDED 기록이 있어도 탑승 이전이나 취소 상태 응답은 허용하지 않는다", async () => {
  for (const status of ["PREPAYING", "READY", "CANCELLED"]) {
    await assert.rejects(
      recordBoarding(
        {
          confirmBoarding: async () => ({
            data: {
              ...party,
              status,
              members: [{ ...party.members[0], boardingStatus: "BOARDED" }],
            },
          }),
        },
        { party },
        "BOARDED",
        "key",
        departure,
      ),
    );
  }
});
