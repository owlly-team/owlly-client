import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";

test("HTTP 200 오류 본문도 실패로 처리하고 실제 상태·코드·추적 ID·대기 시간을 보존한다", async () => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
  });
  const originalFetch = globalThis.fetch;
  try {
    const { apiResponse } = await server.ssrLoadModule(
      "/src/shared/api/client.js",
    );
    for (const status of [200, 409, 429]) {
      globalThis.fetch = async () =>
        new Response(
          JSON.stringify({
            error: {
              code: "ACCOUNT_LOCKED",
              message: "locked",
              traceId: "test-trace",
            },
          }),
          { status, headers: { "Retry-After": "10" } },
        );
      await assert.rejects(apiResponse("/test"), {
        status,
        code: "ACCOUNT_LOCKED",
        message: "locked",
        traceId: "test-trace",
        retryAfter: "10",
      });
    }
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({ data: { amount: 0 }, meta: { hasMore: false } }),
        { status: 200, headers: { ETag: '"v1"' } },
      );
    assert.deepEqual(await apiResponse("/test"), {
      data: { amount: 0 },
      meta: { hasMore: false },
      etag: '"v1"',
    });
  } finally {
    globalThis.fetch = originalFetch;
    await server.close();
  }
});
