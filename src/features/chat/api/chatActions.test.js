import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createReportBody, submitReport } from "../utils/reportFlow.js";

test("더보기의 API-24 ETag 요청과 API-30 신고의 쿠키·CSRF·동일 키 재시도 계약", async () => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
  });
  const originalFetch = globalThis.fetch;
  let session;
  try {
    const { createChatApi } = await server.ssrLoadModule(
      "/src/features/chat/api/chatApi.js",
    );
    const { createMatchingApi } = await server.ssrLoadModule(
      "/src/features/matching/api/matchingApi.js",
    );
    session = (await server.ssrLoadModule("/src/shared/stores/sessionStore.js"))
      .default;
    session
      .getState()
      .setSession({ user: { id: "101" }, csrfToken: "test-csrf" });
    const party = {
      id: "401",
      myMemberId: "501",
      members: [
        { memberId: "501", decision: "ACCEPTED" },
        { memberId: "502", decision: "LEFT" },
      ],
    };
    const body = createReportBody({
      party,
      room: { id: "601", partyId: "401", status: "OPEN" },
      targetMemberId: "502",
      reasonCode: "PRIVACY_REQUEST",
    });
    const key = "eb14443a-8bb2-49a0-a201-f60c2d5eb906";
    let reports = 0;
    globalThis.fetch = async (url, options) => {
      assert.equal(options.method, "POST");
      assert.equal(options.credentials, "include");
      assert.equal(options.headers["X-CSRF-Token"], "test-csrf");
      assert.equal(options.headers["Idempotency-Key"], key);
      if (url.endsWith("/api/v1/parties/401/leave")) {
        assert.equal(options.body, undefined);
        assert.equal(options.headers["If-Match"], '"party-v1"');
        return new Response(
          JSON.stringify({
            data: {
              ...party,
              members: party.members.map((member) => ({
                ...member,
                decision: "LEFT",
              })),
            },
          }),
          { status: 200, headers: { ETag: '"party-v2"' } },
        );
      }
      assert.ok(url.endsWith("/api/v1/rooms/601/reports"));
      assert.equal(options.cache, "no-store");
      assert.deepEqual(JSON.parse(options.body), body);
      reports++;
      if (reports === 1) throw new TypeError("network failure");
      return new Response(
        JSON.stringify({
          data: {
            id: "801",
            status: "RECEIVED",
            rematchingBlocked: true,
            evidenceDeleteAfter: "2026-11-21T11:00:00+09:00",
          },
        }),
        { status: 201 },
      );
    };
    const api = createChatApi("test-csrf");
    await assert.rejects(
      submitReport(api, "601", body, key),
      /network failure/,
    );
    assert.equal(
      (await submitReport(api, "601", body, key)).rematchingBlocked,
      true,
    );
    assert.equal(reports, 2);
    assert.equal(
      (
        await createMatchingApi("test-csrf").leaveParty(
          "401",
          '"party-v1"',
          key,
        )
      ).etag,
      '"party-v2"',
    );
  } finally {
    globalThis.fetch = originalFetch;
    session?.getState().clearSession();
    await server.close();
  }
});
