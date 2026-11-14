import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { confirmTaxiCall } from "../utils/taxiCallFlow.js";

test("API-25 본문 없는 POST·쿠키·CSRF·If-Match·동일 멱등 키 재시도와 ETag 반영", async () => {
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
    const { partyCache, partyCacheKey } = await server.ssrLoadModule(
      "/src/features/matching/stores/partyCache.js",
    );
    session
      .getState()
      .setSession({ user: { id: "101" }, csrfToken: "test-csrf" });
    const party = {
      id: "401",
      myMemberId: "503",
      representativeMemberId: "503",
      status: "PREPAYING",
      taxiCalledAt: null,
      members: [{ memberId: "503", decision: "ACCEPTED" }],
      allowedActions: ["CONFIRM_TAXI_CALL"],
    };
    const updated = {
      ...party,
      status: "READY",
      taxiCalledAt: "2026-11-14T23:31:00+09:00",
    };
    const key = "eb14443a-8bb2-49a0-a201-f60c2d5eb906";
    let calls = 0;
    globalThis.fetch = async (url, options) => {
      assert.ok(url.endsWith("/api/v1/parties/401/taxi-call-confirmation"));
      assert.equal(options.method, "POST");
      assert.equal(options.body, undefined);
      assert.equal(options.credentials, "include");
      assert.equal(options.headers["X-CSRF-Token"], "test-csrf");
      assert.equal(options.headers["Idempotency-Key"], key);
      assert.equal(options.headers["If-Match"], '"party-v1"');
      calls++;
      if (calls === 1) throw new TypeError("network failure");
      return new Response(JSON.stringify({ data: updated }), {
        status: 200,
        headers: { ETag: '"party-v2"' },
      });
    };
    const api = createMatchingApi("test-csrf");
    await assert.rejects(
      confirmTaxiCall(api, { party, etag: '"party-v1"' }, key),
      /network failure/,
    );
    const result = await confirmTaxiCall(
      api,
      { party, etag: '"party-v1"' },
      key,
    );
    assert.equal(result.etag, '"party-v2"');
    assert.equal(calls, 2);
    const cached =
      partyCache.store.getState().entries[partyCacheKey("101", "401")];
    assert.equal(cached.response.data.status, "READY");
    assert.equal(cached.response.etag, '"party-v2"');
  } finally {
    globalThis.fetch = originalFetch;
    session?.getState().clearSession();
    await server.close();
  }
});
