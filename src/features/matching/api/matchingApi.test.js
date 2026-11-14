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
