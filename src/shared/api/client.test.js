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

test("only reference GETs share session cache; profile writes invalidate response and ETag", async () => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
  });
  const originalFetch = globalThis.fetch;
  let cache;
  try {
    const { apiResponse, apiGetWithEtag } = await server.ssrLoadModule(
      "/src/shared/api/client.js",
    );
    ({ referenceCache: cache } = await server.ssrLoadModule(
      "/src/shared/api/referenceCache.js",
    ));
    cache.activate("101", "session1");
    const calls = [];
    let version = 1;
    globalThis.fetch = async (url, options) => {
      const path = new URL(url, "http://localhost").pathname;
      calls.push([path, options.method]);
      if (options.method === "PATCH") version++;
      return new Response(JSON.stringify({ data: { version } }), {
        headers: { ETag: `"v${version}"` },
      });
    };
    await Promise.all([apiResponse("/me/profile"), apiResponse("/me/profile")]);
    assert.equal(calls.length, 1);
    assert.equal((await apiGetWithEtag("/me/profile")).etag, '"v1"');
    assert.equal(calls.length, 1);
    await apiResponse("/me/profile", {
      method: "PATCH",
      body: { sameGenderDefault: true },
    });
    assert.equal((await apiGetWithEtag("/me/profile")).etag, '"v2"');
    assert.equal(calls.length, 3);
    for (const path of [
      "/parties/401",
      "/parties/401/settlement",
      "/parties/401/room",
      "/rooms/601/messages",
    ]) {
      const before = calls.length;
      await apiResponse(path);
      await apiResponse(path);
      assert.equal(calls.length - before, 2);
    }
    await apiResponse("/banks");
    await apiResponse("/banks");
    assert.equal(calls.filter(([path]) => path.endsWith("/banks")).length, 1);
    cache.activate("102", "session2");
    await apiResponse("/banks");
    assert.equal(calls.filter(([path]) => path.endsWith("/banks")).length, 2);
  } finally {
    cache?.reset();
    globalThis.fetch = originalFetch;
    await server.close();
  }
});
