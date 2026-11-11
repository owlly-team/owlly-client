import assert from "node:assert/strict";
import { test } from "node:test";
import { getMyPrepayTransferId, getPrepayAmount, getRoomPhase, isGatheringTime } from "./prepayUtils.js";

const party = { id: "401", myMemberId: "502", representativeMemberId: "503" };
const prepay = { id: "701", settlementItemId: "10002", kind: "PREPAY", payerMemberId: "502", payeeMemberId: "503", status: "PENDING" };
function settlementWith(transfers) {
  return { partyId: "401", items: [
    { id: "10001", memberId: "501", transfers: [{ ...prepay, id: "702", payerMemberId: "501" }] },
    { id: "10002", memberId: "502", transfers },
  ] };
}

test("selects only the current member's PREPAY to the representative", () => {
  const refund = { ...prepay, id: "703", kind: "REFUND", payerMemberId: "503", payeeMemberId: "502" };
  assert.equal(getMyPrepayTransferId(party, settlementWith([refund, prepay])), "701");
  for (const status of ["PENDING", "SENT", "RECEIVED"]) {
    assert.equal(getMyPrepayTransferId(party, settlementWith([{ ...prepay, status }])), "701");
  }
});

test("never selects another payer, payee, item, party or a cancelled/ambiguous transfer", () => {
  for (const patch of [
    { payerMemberId: "501" }, { payeeMemberId: "504" }, { kind: "REFUND" },
    { status: "CANCELLED" }, { status: "UNKNOWN" }, { settlementItemId: "10001" },
    { id: "0" }, { id: "../701" },
  ]) {
    assert.equal(getMyPrepayTransferId(party, settlementWith([{ ...prepay, ...patch }])), null);
  }
  assert.equal(getMyPrepayTransferId(party, { ...settlementWith([prepay]), partyId: "402" }), null);
  assert.equal(getMyPrepayTransferId(party, settlementWith([prepay, { ...prepay, id: "704" }])), null);
  assert.equal(getMyPrepayTransferId({ ...party, myMemberId: "503" }, settlementWith([prepay])), null);
  assert.equal(getMyPrepayTransferId(party, null), null);
  assert.equal(getMyPrepayTransferId(party, settlementWith([])), null);
  assert.equal(getMyPrepayTransferId(party, { partyId: "401", items: [{ memberId: "502" }] }), null);
});

test("gathering uses the full date and timezone, switching at the exact scheduled time", () => {
  const departureAt = "2026-11-11T23:30:00+09:00";
  const boundary = Date.parse("2026-11-11T14:30:00Z");
  assert.equal(isGatheringTime(departureAt, boundary - 1), false);
  assert.equal(isGatheringTime(departureAt, boundary), true);
  assert.equal(isGatheringTime(departureAt, boundary + 86400000), true);
  assert.equal(isGatheringTime(null, boundary), false);
  assert.equal(isGatheringTime("invalid", boundary), false);
});

test("past gathering times open prepayment immediately and taxi calls keep boarding active", () => {
  const party = { departureAt: "2026-11-11T23:30:00+09:00", taxiCalledAt: null };
  const boundary = Date.parse(party.departureAt);
  assert.equal(getRoomPhase(party, boundary - 1, false), "chat");
  assert.equal(getRoomPhase(party, boundary, false), "prepay");
  assert.equal(getRoomPhase(party, boundary + 3600000, false), "prepay");
  assert.equal(getRoomPhase(party, boundary, true), "boarding");
  assert.equal(getRoomPhase({ ...party, taxiCalledAt: party.departureAt }, boundary, false), "boarding");
  assert.equal(getRoomPhase({ ...party, status: "RIDING" }, boundary, false), "boarding");
});

test("prepayment respects the server amount and otherwise rounds 1.2 times the share up to 100 won", () => {
  assert.equal(getPrepayAmount({ estimatedShareWon: 7900 }), 9500);
  assert.equal(getPrepayAmount({ estimatedShareWon: 4500 }), 5400);
  assert.equal(getPrepayAmount({ estimatedShareWon: 7800, prepayDueWon: 9600 }), 9600);
  assert.equal(getPrepayAmount({ estimatedShareWon: 7900, prepayDueWon: 0 }), 0);
  assert.equal(getPrepayAmount(undefined), null);
  assert.equal(getPrepayAmount({ estimatedShareWon: -100 }), null);
});
