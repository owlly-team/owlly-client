import test from "node:test";
import assert from "node:assert/strict";
import { loadMatchingResult } from "./matchingResultApi.js";
import { toMatchingResultView, toRepresentativePayments } from "./utils/matchingResultUtils.js";
import { upsertPrepayAccount } from "./roomAccountApi.js";

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

test("representative is determined by party IDs, and receives other members' prepayments", () => {
  const representative = {
    ...party, representativeMemberId: "503", myMemberId: "503",
  };
  const allItems = { ...settlement, items: [
    { memberId: "501", estimatedShareWon: 4500, prepayDueWon: 5400 },
    { memberId: "502", estimatedShareWon: 7900, prepayDueWon: 9500 },
    { memberId: "503", estimatedShareWon: 7900, prepayDueWon: 0 },
    { memberId: "504", estimatedShareWon: 4500, prepayDueWon: 5400 },
  ] };
  assert.equal(toMatchingResultView(representative, allItems).isRepresentative, true);
  assert.equal(toMatchingResultView({ ...representative, myMemberId: "502" }, allItems).isRepresentative, false);
  const view = toRepresentativePayments(representative, allItems);
  assert.equal(view.totalWon, 14900);
  assert.deepEqual(view.payments.map(({ member }) => member.memberId), ["501", "502"]);
  assert.equal(toRepresentativePayments(representative, settlement).totalWon, null);
  assert.equal(toRepresentativePayments(representative, null).totalWon, null);
  assert.equal(toRepresentativePayments(representative, { ...allItems, partyId: "999" }).totalWon, null);
});

test("account PUT uses normalized fields, CSRF, session and a stable retry key", async () => {
  const calls = [];
  const masked = { bankCode: "DEMO", maskedAccountNumber: "********0000", maskedHolderName: "박*표" };
  const options = {
    csrfToken: "test-csrf", idempotencyKey: "07e1c277-3b26-4f6d-9741-6d646469fda1",
    fetcher: async (url, init) => { calls.push({ url, init }); return response(masked); },
  };
  const input = { bankCode: " DEMO ", accountNumber: "0000-0000 0000", holderName: " 박대표 " };
  assert.deepEqual(await upsertPrepayAccount("601", input, options), masked);
  await upsertPrepayAccount("601", input, options);
  assert.equal(calls[0].url, "/api/v1/rooms/601/accounts/PREPAY_RECEIVE");
  assert.equal(calls[0].init.method, "PUT");
  assert.equal(calls[0].init.credentials, "include");
  assert.equal(calls[0].init.headers["X-CSRF-Token"], "test-csrf");
  assert.equal(calls[0].init.headers["Idempotency-Key"], calls[1].init.headers["Idempotency-Key"]);
  assert.deepEqual(JSON.parse(calls[0].init.body), { bankCode: "DEMO", accountNumber: "000000000000", holderName: "박대표" });
});

test("account errors do not expose server-provided account data", async () => {
  for (const code of ["ACCOUNT_LOCKED", "ROOM_CLOSED", "ACCOUNT_PURPOSE_NOT_ALLOWED"]) {
    await assert.rejects(upsertPrepayAccount("601", {
      bankCode: "DEMO", accountNumber: "0000", holderName: "박대표",
    }, {
      csrfToken: "test-csrf", idempotencyKey: "retry-key",
      fetcher: async () => ({ ok: false, status: 409, json: async () => ({ error: { code, message: "sensitive-account-data" } }) }),
    }), (error) => error.code === code && !error.message.includes("sensitive-account-data"));
  }
});

test("missing CSRF, room or account information never sends an account request", async () => {
  const fetcher = async () => assert.fail("must not send invalid account requests");
  const input = { bankCode: "DEMO", accountNumber: "0000", holderName: "박대표" };
  await assert.rejects(upsertPrepayAccount(null, input, { fetcher }));
  await assert.rejects(upsertPrepayAccount("601", input, { fetcher }));
  await assert.rejects(upsertPrepayAccount("601", { ...input, accountNumber: " - " }, {
    fetcher, csrfToken: "test", idempotencyKey: "retry-key",
  }));
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
