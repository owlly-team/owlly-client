import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { representativeSettlementMock as finalized } from "../mocks/memberSettlementMock.js";
import { finalizeFare, validateFarePreview } from "../utils/fareFlow.js";
import { updateSettlementRoute } from "../utils/routeFlow.js";

test("API-37·38의 본문·쿠키·CSRF·정산 ETag·멱등 재시도와 오류를 검증한다", async () => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
  });
  const originalFetch = globalThis.fetch;
  try {
    const { createSettlementApi } = await server.ssrLoadModule(
      "/src/features/settlement/api/settlementApi.js",
    );
    const party = {
      id: "401",
      myMemberId: "503",
      representativeMemberId: "503",
      routeVersion: 2,
      members: finalized.items.map(({ memberId }) => ({ memberId })),
    };
    const settlement = {
      ...finalized,
      actualTotalWon: null,
      finalizedAt: null,
      status: "AWAITING_FARE",
    };
    const context = { party, settlement, settlementEtag: '"settlement-v1"' };
    const input = { actualTotalWon: 30000, routeVersion: 2 };
    const preview = {
      ...input,
      canFinalize: true,
      blockingReasons: [],
      items: finalized.items.map(
        ({ memberId, actualShareWon, refundDueWon }) => ({
          memberId,
          actualShareWon,
          refundDueWon,
        }),
      ),
    };
    const controller = new AbortController();
    const api = createSettlementApi("csrf-test", controller.signal);
    const key = "eb14443a-8bb2-49a0-a201-f60c2d5eb906";
    let finalizeCalls = 0;
    let failureStatus;
    globalThis.fetch = async (url, options) => {
      assert.equal(options.method, "POST");
      assert.equal(options.credentials, "include");
      assert.equal(options.signal, controller.signal);
      assert.equal(options.cache, "no-store");
      assert.equal(options.headers["X-CSRF-Token"], "csrf-test");
      assert.deepEqual(JSON.parse(options.body), input);
      if (failureStatus)
        return new Response(
          JSON.stringify({
            error: {
              code:
                failureStatus === 412
                  ? "PRECONDITION_FAILED"
                  : "FARE_LIMIT_EXCEEDED",
              message: "test",
            },
          }),
          { status: failureStatus, headers: { "Retry-After": "10" } },
        );
      if (url.endsWith("/api/v1/parties/401/settlement/preview")) {
        assert.equal(options.headers["Idempotency-Key"], undefined);
        assert.equal(options.headers["If-Match"], undefined);
        return new Response(JSON.stringify({ data: preview }), { status: 200 });
      }
      assert.ok(url.endsWith("/api/v1/parties/401/settlement/finalize"));
      assert.equal(options.headers["Idempotency-Key"], key);
      assert.equal(options.headers["If-Match"], '"settlement-v1"');
      if (++finalizeCalls === 1) throw new TypeError("response lost");
      return new Response(JSON.stringify({ data: finalized }), {
        status: 200,
        headers: { ETag: '"settlement-v2"' },
      });
    };
    const calculated = validateFarePreview(
      (await api.preview("401", input)).data,
      input,
      context,
    );
    await assert.rejects(
      finalizeFare(api, context, input, calculated, key),
      /response lost/,
    );
    const response = await finalizeFare(api, context, input, calculated, key);
    assert.equal(finalizeCalls, 2);
    assert.equal(response.etag, '"settlement-v2"');
    assert.equal(response.data.actualTotalWon, 30000);
    failureStatus = 412;
    await assert.rejects(finalizeFare(api, context, input, calculated, key), {
      status: 412,
      code: "PRECONDITION_FAILED",
    });
    failureStatus = 422;
    await assert.rejects(api.preview("401", input), {
      status: 422,
      code: "FARE_LIMIT_EXCEEDED",
      retryAfter: "10",
    });
  } finally {
    globalThis.fetch = originalFetch;
    await server.close();
  }
});

test("API-36 PATCH는 선택 순서·수정 전 버전·정산 ETag·동일 멱등 키로 재시도한다", async () => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
  });
  const originalFetch = globalThis.fetch;
  try {
    const { createSettlementApi } = await server.ssrLoadModule(
      "/src/features/settlement/api/settlementApi.js",
    );
    const settlement = {
      ...finalized,
      actualTotalWon: null,
      finalizedAt: null,
      status: "AWAITING_FARE",
    };
    const party = {
      id: "401",
      myMemberId: "503",
      representativeMemberId: "503",
      routeVersion: 2,
      members: settlement.items.map(({ memberId }) => ({ memberId })),
    };
    const context = { party, settlement, settlementEtag: '"s2"' };
    const ids = ["502", "501", "503"];
    const controller = new AbortController();
    let calls = 0;
    let errorStatus;
    globalThis.fetch = async (url, options) => {
      assert.ok(url.endsWith("/api/v1/parties/401/settlement/route"));
      assert.equal(options.method, "PATCH");
      assert.equal(options.credentials, "include");
      assert.equal(options.signal, controller.signal);
      assert.equal(options.headers["X-CSRF-Token"], "csrf");
      assert.equal(options.headers["If-Match"], '"s2"');
      assert.equal(options.headers["Idempotency-Key"], "same-key");
      assert.deepEqual(JSON.parse(options.body), {
        orderedMemberIds: ids,
        expectedRouteVersion: 2,
      });
      if (errorStatus)
        return new Response(
          JSON.stringify({
            error: {
              code:
                errorStatus === 412
                  ? "PRECONDITION_FAILED"
                  : "ROUTE_VERSION_CONFLICT",
              message: "test",
            },
          }),
          { status: errorStatus },
        );
      if (++calls === 1) throw new TypeError("response lost");
      return new Response(
        JSON.stringify({ data: { ...settlement, routeVersion: 3 } }),
        { status: 200, headers: { ETag: '"s3"' } },
      );
    };
    const api = createSettlementApi("csrf", controller.signal);
    await assert.rejects(
      updateSettlementRoute(api, context, ids, "same-key"),
      /response lost/,
    );
    const result = await updateSettlementRoute(api, context, ids, "same-key");
    assert.equal(result.settlement.routeVersion, 3);
    assert.equal(result.settlementEtag, '"s3"');
    assert.equal(calls, 2);
    for (const status of [409, 412]) {
      errorStatus = status;
      await assert.rejects(
        updateSettlementRoute(api, context, ids, "same-key"),
        { status },
      );
    }
  } finally {
    globalThis.fetch = originalFetch;
    await server.close();
  }
});
