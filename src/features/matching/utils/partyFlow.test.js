import test from "node:test";
import assert from "node:assert/strict";
import {
  confirmMembership,
  loadMatchingResult,
  loadPartyRoom,
  validateParty,
} from "./partyFlow.js";

const party = {
  id: "401",
  myMemberId: "502",
  representativeMemberId: "503",
  status: "CONFIRMING",
  confirmDeadlineAt: "2026-11-14T23:15:00+09:00",
  allowedActions: ["CONFIRM", "LEAVE"],
  roomId: null,
  members: [
    { memberId: "502", decision: "PENDING" },
    { memberId: "503", decision: "PENDING" },
  ],
};
const now = Date.parse("2026-11-14T23:00:00+09:00");

test("party lookup tolerates settlement not ready without inventing fares", async () => {
  const result = await loadMatchingResult(
    {
      party: async () => ({ data: party, etag: '"p1"' }),
      settlement: async () => {
        throw Object.assign(new Error(), { code: "SETTLEMENT_NOT_READY" });
      },
      banks: async () => ({ data: [] }),
    },
    "401",
  );
  assert.equal(result.partyEtag, '"p1"');
  assert.equal(result.settlement, null);
  assert.equal(result.settlementNotReady, true);
  assert.equal(result.settlementError, false);
});

test("API-22와 API-33의 응답 및 ETag를 각각 보존한다", async () => {
  const settlement = {
    partyId: "401",
    items: [{ memberId: "502", estimatedShareWon: 7900, prepayDueWon: 9500 }],
  };
  const result = await loadMatchingResult(
    {
      party: async () => ({ data: party, etag: '"party-v1"' }),
      settlement: async (id) => {
        assert.equal(id, "401");
        return { data: settlement, etag: '"settlement-v2"' };
      },
      banks: async () => ({ data: [] }),
    },
    "401",
  );
  assert.equal(result.party, party);
  assert.equal(result.settlement, settlement);
  assert.equal(result.partyEtag, '"party-v1"');
  assert.equal(result.settlementEtag, '"settlement-v2"');
});

test("party/member ID mismatches and expired authentication never become a successful result", async () => {
  assert.throws(() => validateParty(party, "999"), /정보/);
  assert.throws(() => validateParty(party, "401", "503"), /정보/);
  await assert.rejects(
    loadMatchingResult(
      {
        party: async () => ({ data: party }),
        settlement: async () => {
          throw Object.assign(new Error("expired"), { status: 401 });
        },
        banks: async () => ({ data: [] }),
      },
      "401",
    ),
    /expired/,
  );
});

test("confirmation forwards the exact ETag, uses the server state and updates its ETag", async () => {
  const context = { party, partyEtag: '"p1"' };
  const accepted = {
    ...party,
    roomId: "601",
    members: party.members.map((member) =>
      member.memberId === "502" ? { ...member, decision: "ACCEPTED" } : member,
    ),
  };
  const result = await confirmMembership(
    {
      confirmParty: async (...args) => {
        assert.deepEqual(args, ["401", '"p1"', "same-command"]);
        return { data: accepted, etag: '"p2"' };
      },
    },
    context,
    "same-command",
    now,
  );
  assert.equal(result.party.status, "CONFIRMING");
  assert.equal(result.partyEtag, '"p2"');
  assert.equal(result.party.members[1].decision, "PENDING");
  assert.equal(
    await confirmMembership({}, result, "unused", now + 86400000),
    result,
  );
});

test("confirmation requires an allowed action, current ETag and unexpired deadline", async () => {
  await assert.rejects(confirmMembership({}, { party }, "key", now), /버전/);
  await assert.rejects(
    confirmMembership(
      {},
      { party: { ...party, allowedActions: [] }, partyEtag: '"p1"' },
      "key",
      now,
    ),
    /확정할 수 없어요/,
  );
  await assert.rejects(
    confirmMembership(
      {},
      { party, partyEtag: '"p1"' },
      "key",
      Date.parse(party.confirmDeadlineAt),
    ),
    /마감/,
  );
});

test("room lookup preserves zero-prefixed verification codes and validates all resource IDs", async () => {
  const accepted = {
    ...party,
    roomId: "601",
    members: [{ memberId: "502", decision: "ACCEPTED" }],
  };
  const room = {
    id: "601",
    partyId: "401",
    status: "OPEN",
    verificationCode: "0042",
  };
  assert.equal(
    (
      await loadPartyRoom(
        { room: async () => ({ data: room }) },
        accepted,
        "601",
      )
    ).verificationCode,
    "0042",
  );
  await assert.rejects(
    loadPartyRoom(
      { room: async () => ({ data: { ...room, partyId: "999" } }) },
      accepted,
    ),
    /일치하지/,
  );
  await assert.rejects(
    loadPartyRoom({ room: async () => ({ data: room }) }, accepted, "999"),
    /일치하지/,
  );
  await assert.rejects(loadPartyRoom({}, party), /먼저 확정/);
});

test("room not ready and access expiry stay separate from success", async () => {
  const accepted = {
    ...party,
    members: [{ memberId: "502", decision: "ACCEPTED" }],
  };
  await assert.rejects(
    loadPartyRoom(
      {
        room: async () => {
          throw Object.assign(new Error("not ready"), {
            code: "ROOM_NOT_READY",
          });
        },
      },
      accepted,
    ),
    { code: "ROOM_NOT_READY" },
  );
  await assert.rejects(
    loadPartyRoom(
      {
        room: async () => ({
          data: { id: "601", partyId: "401", status: "CLOSED" },
        }),
      },
      accepted,
    ),
    { code: "ROOM_ACCESS_EXPIRED" },
  );
});
