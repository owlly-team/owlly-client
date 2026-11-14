import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { recordBoarding } from "../utils/boardingFlow.js";

test("API-26은 상태만 POST하며 동일 키로 재시도하고 서버 귀가 기록을 API-16에서 확인한다", async () => {
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
    session = (await server.ssrLoadModule("/src/shared/stores/sessionStore.js"))
      .default;
    session
      .getState()
      .setSession({ user: { id: "101" }, csrfToken: "test-csrf" });
    for (const status of ["BOARDED", "MISSED"]) {
      const party = {
        id: "401",
        myMemberId: "501",
        status: "PREPAYING",
        departureAt: "2026-11-14T23:30:00+09:00",
        allowedActions: ["RECORD_BOARDING"],
        members: [
          { memberId: "501", decision: "ACCEPTED", boardingStatus: "UNKNOWN" },
        ],
      };
      const key = "eb14443a-8bb2-49a0-a201-f60c2d5eb906";
      let calls = 0;
      let outcome = "UNRESOLVED";
      globalThis.fetch = async (url, options) => {
        assert.equal(options.credentials, "include");
        if (url.includes("/api/v1/me/journeys?"))
          return new Response(
            JSON.stringify({ data: [{ id: "201", outcome }] }),
            { status: 200 },
          );
        assert.ok(url.endsWith("/api/v1/parties/401/boarding"));
        assert.equal(options.method, "POST");
        assert.equal(options.headers["X-CSRF-Token"], "test-csrf");
        assert.equal(options.headers["Idempotency-Key"], key);
        assert.equal(options.headers["If-Match"], undefined);
        assert.deepEqual(JSON.parse(options.body), { status });
        calls++;
        if (calls === 1) throw new TypeError("network failure");
        outcome = status === "BOARDED" ? "POOL_BOARDED" : "UNRESOLVED";
        return new Response(
          JSON.stringify({
            data: {
              ...party,
              status: status === "BOARDED" ? "RIDING" : "PREPAYING",
              members: [{ ...party.members[0], boardingStatus: status }],
            },
          }),
          { status: 200, headers: { ETag: '"v2"' } },
        );
      };
      const api = createMatchingApi("test-csrf");
      const now = Date.parse(party.departureAt);
      await assert.rejects(
        recordBoarding(api, { party }, status, key, now),
        /network failure/,
      );
      const result = await recordBoarding(api, { party }, status, key, now);
      assert.equal(result.etag, '"v2"');
      assert.equal(
        (await api.journeys()).data[0].outcome,
        status === "BOARDED" ? "POOL_BOARDED" : "UNRESOLVED",
      );
      assert.equal(calls, 2);
    }
  } finally {
    globalThis.fetch = originalFetch;
    session?.getState().clearSession();
    await server.close();
  }
});
