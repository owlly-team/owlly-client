import test from "node:test";
import assert from "node:assert/strict";
import {
  confirmTaxiCall,
  getTaxiCallState,
  taxiCallErrorMessage,
} from "./taxiCallFlow.js";
import { getRoomPhase } from "./prepayUtils.js";
const party = {
  id: "401",
  myMemberId: "503",
  representativeMemberId: "503",
  status: "PREPAYING",
  taxiCalledAt: null,
  departureAt: "2026-11-14T23:30:00+09:00",
  members: [{ memberId: "503", decision: "ACCEPTED" }],
  allowedActions: ["CONFIRM_TAXI_CALL"],
};

test("확정 대표·PREPAYING·허용 동작·팟 ETag가 필요하며 송금 수령 상태를 임의로 요구하지 않는다", () => {
  assert.equal(getTaxiCallState(party, '"p1"').canConfirm, true);
  for (const data of [
    { ...party, myMemberId: "502" },
    { ...party, status: "READY" },
    { ...party, allowedActions: [] },
    { ...party, members: [{ memberId: "503", decision: "PENDING" }] },
  ])
    assert.equal(getTaxiCallState(data, '"p1"').canConfirm, false);
  assert.equal(getTaxiCallState(party, null).canConfirm, false);
});
test("서버의 READY·taxiCalledAt·ETag를 사용한 뒤 탑승 단계로 바뀌고 기록 재전송은 생략한다", async () => {
  const updated = {
    ...party,
    status: "READY",
    taxiCalledAt: "2026-11-14T23:31:00+09:00",
  };
  const result = await confirmTaxiCall(
    {
      confirmTaxiCall: async (...args) => {
        assert.deepEqual(args, ["401", '"p1"', "same-key"]);
        return { data: updated, etag: '"p2"' };
      },
    },
    { party, etag: '"p1"' },
    "same-key",
  );
  assert.equal(result.party, updated);
  assert.equal(result.etag, '"p2"');
  assert.equal(
    getRoomPhase(result.party, Date.parse(updated.taxiCalledAt), false),
    "boarding",
  );
  assert.equal(await confirmTaxiCall({}, result, "unused"), result);
});
test("틀린 팟·호출 미기록·실패 응답은 성공으로 바꾸지 않는다", async () => {
  for (const data of [
    { ...party, id: "other" },
    { ...party, myMemberId: "other" },
    { ...party, status: "READY" },
  ])
    await assert.rejects(
      confirmTaxiCall(
        { confirmTaxiCall: async () => ({ data }) },
        { party, etag: '"p1"' },
        "key",
      ),
    );
  const conflict = Object.assign(new Error("conflict"), { status: 412 });
  await assert.rejects(
    confirmTaxiCall(
      {
        confirmTaxiCall: async () => {
          throw conflict;
        },
      },
      { party, etag: '"p1"' },
      "key",
    ),
    (error) => error === conflict,
  );
  assert.match(taxiCallErrorMessage(conflict), /최신 정보/);
});
