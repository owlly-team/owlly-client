import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";

test("API-23 sends a bodyless POST with session, CSRF, Party ETag and the same retry UUID", async () => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
  });
  const originalFetch = globalThis.fetch;
  let session;
  try {
    const { createMatchingApi } = await server.ssrLoadModule(
      "/src/features/matching/api/matchingApi.js",
    );
    const { default: sessionStore } = await server.ssrLoadModule(
      "/src/shared/stores/sessionStore.js",
    );
    const { confirmMembership, loadPartyRoom } = await server.ssrLoadModule(
      "/src/features/matching/utils/partyFlow.js",
    );
    session = sessionStore;
    session
      .getState()
      .setSession({ user: { id: "101" }, csrfToken: "test-csrf" });
    const key = "eb14443a-8bb2-49a0-a201-f60c2d5eb906";
    const now = Date.parse("2026-11-14T23:00:00+09:00");

    for (const myMemberId of ["501", "503"]) {
      const party = {
        id: "401",
        myMemberId,
        representativeMemberId: "503",
        status: "CONFIRMING",
        allowedActions: ["CONFIRM"],
        confirmDeadlineAt: "2026-11-14T23:15:00+09:00",
        roomId: null,
        members: ["501", "502", "503"].map((memberId) => ({
          memberId,
          decision: "PENDING",
        })),
      };
      const accepted = {
        ...party,
        roomId: "601",
        members: party.members.map((member) =>
          member.memberId === myMemberId
            ? { ...member, decision: "ACCEPTED" }
            : member,
        ),
      };
      let posts = 0;
      let roomGets = 0;
      globalThis.fetch = async (url, options) => {
        assert.equal(options.credentials, "include");
        if (options.method === "POST") {
          assert.ok(url.endsWith("/api/v1/parties/401/confirm"));
          assert.equal(options.body, undefined);
          assert.equal(options.headers["X-CSRF-Token"], "test-csrf");
          assert.equal(options.headers["If-Match"], '"party-v1"');
          assert.equal(options.headers["Idempotency-Key"], key);
          posts++;
          if (posts === 1) throw new TypeError("simulated network failure");
          return new Response(JSON.stringify({ data: accepted }), {
            status: 200,
            headers: { ETag: '"party-v2"' },
          });
        }
        assert.ok(url.endsWith("/api/v1/parties/401/room"));
        roomGets++;
        return new Response(
          JSON.stringify({
            data: {
              id: "601",
              partyId: "401",
              status: "OPEN",
              verificationCode: "0042",
            },
          }),
          { status: 200 },
        );
      };
      const api = createMatchingApi("test-csrf");
      const context = { party, partyEtag: '"party-v1"' };
      await assert.rejects(
        confirmMembership(api, context, key, now),
        /network failure/,
      );
      const result = await confirmMembership(api, context, key, now);
      assert.equal(posts, 2);
      assert.equal(result.partyEtag, '"party-v2"');
      assert.equal(result.party.status, "CONFIRMING");
      assert.equal(
        result.party.members.find((member) => member.memberId === "502")
          .decision,
        "PENDING",
      );
      assert.equal(await confirmMembership(api, result, key, now), result);
      assert.equal(posts, 2); // ACCEPTED 상태에서는 POST 중복 호출 금지.
      if (myMemberId !== party.representativeMemberId) {
        assert.equal((await loadPartyRoom(api, result.party)).id, "601");
        assert.equal(roomGets, 1); // 다른 멤버·대표 확정을 기다리지 않는다.
      } else {
        assert.equal(roomGets, 0); // 대표의 실제 입장은 계좌 등록 이후다.
      }
    }
  } finally {
    globalThis.fetch = originalFetch;
    session?.getState().clearSession();
    await server.close();
  }
});

test("representative loads API-33 payments and registers API-31 PREPAY_RECEIVE before API-27 entry", async () => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
  });
  const originalFetch = globalThis.fetch;
  let session;
  try {
    const { createMatchingApi } = await server.ssrLoadModule(
      "/src/features/matching/api/matchingApi.js",
    );
    const { default: store } = await server.ssrLoadModule(
      "/src/shared/stores/sessionStore.js",
    );
    const { loadMatchingResult, loadPartyRoom } = await server.ssrLoadModule(
      "/src/features/matching/utils/partyFlow.js",
    );
    const { toRepresentativePayments } = await server.ssrLoadModule(
      "/src/features/matching/utils/matchingResultUtils.js",
    );
    const { registerRepresentativeAccount } = await server.ssrLoadModule(
      "/src/features/matching/utils/representativeAccount.js",
    );
    session = store;
    session
      .getState()
      .setSession({ user: { id: "102" }, csrfToken: "test-csrf" });
    const party = {
      id: "401",
      myMemberId: "503",
      representativeMemberId: "503",
      routeVersion: 1,
      roomId: "601",
      members: ["501", "502", "503"].map((memberId) => ({
        memberId,
        maskedName: memberId,
        decision: "ACCEPTED",
      })),
    };
    const account = {
      bankCode: "004",
      accountNumber: "1234567890",
      holderName: "테스트",
    };
    const paths = [];
    globalThis.fetch = async (url, options) => {
      const path = new URL(url, "http://localhost").pathname;
      paths.push(path);
      assert.equal(options.credentials, "include");
      let data;
      if (path === "/api/v1/parties/401") data = party;
      else if (path === "/api/v1/parties/401/settlement") {
        assert.equal(options.method, "GET");
        data = {
          id: "901",
          partyId: "401",
          routeVersion: 1,
          items: [
            { memberId: "501", estimatedShareWon: 4500, prepayDueWon: 5400 },
            { memberId: "502", estimatedShareWon: 7900, prepayDueWon: 9500 },
            { memberId: "503", estimatedShareWon: 8000, prepayDueWon: 0 },
          ],
        };
      } else if (path === "/api/v1/rooms/601/accounts/PREPAY_RECEIVE") {
        assert.equal(options.method, "PUT");
        assert.equal(options.headers["X-CSRF-Token"], "test-csrf");
        assert.equal(
          options.headers["Idempotency-Key"],
          "eb14443a-8bb2-49a0-a201-f60c2d5eb906",
        );
        assert.deepEqual(JSON.parse(options.body), account);
        data = {
          id: "701",
          purpose: "PREPAY_RECEIVE",
          bankCode: "004",
          maskedAccountNumber: "******7890",
          maskedHolderName: "테*트",
        };
      } else if (path === "/api/v1/parties/401/room") {
        assert.ok(paths.includes("/api/v1/rooms/601/accounts/PREPAY_RECEIVE"));
        data = { id: "601", partyId: "401", status: "OPEN" };
      } else assert.fail(`unexpected API path: ${path}`);
      return new Response(JSON.stringify({ data }), {
        status: 200,
        headers: { ETag: '"v1"' },
      });
    };
    const api = createMatchingApi("test-csrf");
    const context = await loadMatchingResult(api, "401", {
      includeBanks: false,
    });
    assert.equal(
      toRepresentativePayments(context.party, context.settlement).totalWon,
      14900,
    );
    const saved = await registerRepresentativeAccount(
      api,
      "601",
      account,
      "eb14443a-8bb2-49a0-a201-f60c2d5eb906",
    );
    assert.equal("accountNumber" in saved, false);
    assert.equal((await loadPartyRoom(api, context.party)).id, "601");
  } finally {
    globalThis.fetch = originalFetch;
    session?.getState().clearSession();
    await server.close();
  }
});
