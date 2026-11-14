import test from "node:test";
import assert from "node:assert/strict";
import { leaveLiveParty } from "./leaveLiveParty.js";

const party = {
  id: "401",
  myMemberId: "501",
  status: "PREPAYING",
  departureAt: "2026-11-14T23:30:00+09:00",
  allowedActions: ["LEAVE"],
  members: [{ memberId: "501", decision: "ACCEPTED" }],
};
const context = {
  party,
  etag: '"v2"',
  now: Date.parse(party.departureAt) - 900000,
  transfers: [],
};
const left = { ...party, members: [{ memberId: "501", decision: "LEFT" }] };

test("live leave sends party ID, ETag and idempotency key and returns server state", async () => {
  const api = {
    leaveParty: async (...args) => {
      assert.deepEqual(args, ["401", '"v2"', "retry-key"]);
      return { data: left };
    },
  };
  assert.equal(await leaveLiveParty(api, context, "retry-key"), left);
});

test("blocked actions, deadline, transfers and missing ETag prevent requests", async () => {
  const api = {
    leaveParty: () => assert.fail("must not send a leave request"),
  };
  for (const override of [
    { etag: null },
    { now: context.now + 1 },
    { party: { ...party, allowedActions: [] } },
    {
      transfers: [
        { status: "SENT", payerMemberId: "501", payeeMemberId: "503" },
      ],
    },
  ])
    await assert.rejects(
      leaveLiveParty(api, { ...context, ...override }, "key"),
    );
});

test("wrong party, wrong member and unconfirmed leave never count as success", async () => {
  for (const data of [
    { ...left, id: "other" },
    { ...left, myMemberId: "other" },
    party,
  ])
    await assert.rejects(
      leaveLiveParty({ leaveParty: async () => ({ data }) }, context, "key"),
    );
});

test("conflict and network failures propagate without automatic resubmission", async () => {
  for (const failure of [
    Object.assign(new Error("conflict"), { status: 412 }),
    new Error("network"),
  ]) {
    let calls = 0;
    await assert.rejects(
      leaveLiveParty(
        {
          leaveParty: async () => {
            calls++;
            throw failure;
          },
        },
        context,
        "key",
      ),
      (error) => error === failure,
    );
    assert.equal(calls, 1);
  }
});
