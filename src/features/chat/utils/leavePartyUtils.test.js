import test from "node:test";
import assert from "node:assert/strict";
import { getLeavePartyState, leaveMockParty } from "./leavePartyUtils.js";

const party = {
  id: "401", status: "PREPAYING", departureAt: "2026-11-05T23:30:00+09:00",
  myMemberId: "501", representativeMemberId: "503", routeVersion: 2, allowedActions: ["LEAVE"],
  members: [
    { memberId: "501", decision: "ACCEPTED", stopOrder: 1 },
    { memberId: "502", decision: "ACCEPTED", stopOrder: 2 },
    { memberId: "503", decision: "ACCEPTED", stopOrder: 3 },
  ],
};
const now = Date.parse(party.departureAt) - 15 * 60000;

test("leave requires LEAVE and is allowed through the exact 15-minute deadline", () => {
  assert.equal(getLeavePartyState(party, now).canLeave, true);
  assert.equal(getLeavePartyState({ ...party, allowedActions: [] }, now).canLeave, false);
  assert.throws(() => leaveMockParty(party, { now: now + 1 }), { code: "CANCELLATION_DEADLINE_PASSED" });
});

test("accepted member becomes LEFT, remaining stops retain their relative order and route version advances", () => {
  const result = leaveMockParty(party, { now });
  assert.equal(result.id, "401");
  assert.equal(result.members[0].decision, "LEFT");
  assert.equal(result.members[0].stopOrder, null);
  assert.deepEqual(result.members.slice(1).map((member) => member.stopOrder), [1, 2]);
  assert.equal(result.status, "PREPAYING");
  assert.equal(result.representativeMemberId, "503");
  assert.equal(result.routeVersion, 3);
  assert.equal(party.members[0].decision, "ACCEPTED");
});

test("pending member becomes DECLINED and repeated leave returns the same Party even after the deadline", () => {
  const pending = { ...party, members: party.members.map((member) => member.memberId === "501" ? { ...member, decision: "PENDING" } : member) };
  const result = leaveMockParty(pending, { now });
  assert.equal(result.members[0].decision, "DECLINED");
  assert.equal(leaveMockParty(result, { now: now + 1 }), result);
});

test("representative leaving or only one remaining member cancels the party without succession", () => {
  const representative = leaveMockParty({ ...party, myMemberId: "503" }, { now });
  assert.equal(representative.status, "CANCELLED");
  assert.equal(representative.representativeMemberId, "503");
  const twoMembers = leaveMockParty({ ...party, members: party.members.filter((member) => member.memberId !== "502") }, { now });
  assert.equal(twoMembers.status, "CANCELLED");
});

test("SENT and RECEIVED transfers involving self block leave in both payment directions", () => {
  for (const status of ["SENT", "RECEIVED"]) {
    for (const [payerMemberId, payeeMemberId] of [["501", "503"], ["503", "501"]]) {
      assert.throws(() => leaveMockParty(party, { now, transfers: [{ status, payerMemberId, payeeMemberId }] }), { code: "FUNDS_ALREADY_IN_FLIGHT" });
    }
  }
  assert.equal(getLeavePartyState(party, now, [{ status: "PENDING", payerMemberId: "501", payeeMemberId: "503" }]).canLeave, true);
  assert.equal(getLeavePartyState(party, now, [{ status: "RECEIVED", payerMemberId: "502", payeeMemberId: "503" }]).canLeave, true);
});
