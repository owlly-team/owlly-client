import test from "node:test";
import assert from "node:assert/strict";
import { loadMatchingResult } from "./matchingResultApi.js";
import { toMatchingResultView } from "./matchingResultUtils.js";

const party = {
  id: "401", myMemberId: "502", pickupPoint: { universityName: "단국대" },
  members: [
    { memberId: "503", universityName: "단국대", stopOrder: 3, decision: "PENDING" },
    { memberId: "502", universityName: "단국대", stopOrder: 2, decision: "PENDING" },
    { memberId: "501", universityName: "단국대", stopOrder: 1, decision: "ACCEPTED" },
    { memberId: "504", universityName: "다른 학교", stopOrder: null, decision: "LEFT" },
  ],
};
const settlement = {
  partyId: "401",
  items: [
    { memberId: "503", estimatedShareWon: 9000, prepayDueWon: 0 },
    { memberId: "502", estimatedShareWon: 7900, prepayDueWon: 9500 },
  ],
};
const response = (data) => ({ ok: true, json: async () => ({ data }) });

test("loads party and settlement concurrently with session credentials", async () => {
  const calls = [];
  const resolvers = [];
  const pending = loadMatchingResult("401", {
    baseUrl: "https://api.example.test/",
    fetcher: (url, options) => {
      calls.push({ url, options });
      return new Promise((resolve) => resolvers.push(resolve));
    },
  });
  assert.equal(calls.length, 2);
  assert.deepEqual(calls.map(({ url }) => url), [
    "https://api.example.test/api/v1/parties/401",
    "https://api.example.test/api/v1/parties/401/settlement",
  ]);
  assert.ok(calls.every(({ options }) => options.credentials === "include"));
  resolvers[0](response(party));
  resolvers[1](response(settlement));
  assert.deepEqual(await pending, { party, settlement });
});

test("unavailable settlement retains party information and distinguishes 409 from errors", async () => {
  for (const [status, code, notReady] of [[409, "SETTLEMENT_NOT_READY", true], [500, "SERVER_ERROR", false]]) {
    const result = await loadMatchingResult("401", {
      fetcher: async (url) => url.endsWith("/settlement")
        ? { ok: false, status, json: async () => ({ error: { code } }) }
        : response(party),
    });
    assert.equal(result.party, party);
    assert.equal(result.settlement, null);
    assert.equal(result.settlementNotReady, notReady);
    assert.equal(result.settlementError, !notReady);
  }
});

test("party failures and mismatched settlement cannot display another party's data", async () => {
  await assert.rejects(loadMatchingResult("401", {
    fetcher: async () => ({ ok: false, status: 403, json: async () => ({ error: { code: "FORBIDDEN" } }) }),
  }), { status: 403 });
  await assert.rejects(loadMatchingResult("401", {
    fetcher: async (url) => response(url.endsWith("/settlement") ? { ...settlement, partyId: "999" } : party),
  }), /정산 정보가 일치하지/);
});

test("selects own amount, counts companions and sorts only active members", () => {
  const view = toMatchingResultView(party, settlement);
  assert.equal(view.companionCount, 2);
  assert.equal(view.allSameSchool, true);
  assert.deepEqual(view.members.map((member) => member.memberId), ["501", "502", "503"]);
  assert.equal(view.mySettlementItem.prepayDueWon, 9500);
  const representative = toMatchingResultView({ ...party, myMemberId: "503" }, settlement);
  assert.equal(representative.mySettlementItem.prepayDueWon, 0);
  assert.equal(toMatchingResultView(party, null).mySettlementItem, undefined);
  assert.equal(toMatchingResultView(party, { ...settlement, partyId: "999" }).mySettlementItem, undefined);
});
