import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";

test("solo choice sends API-15 then API-17 with cookies, CSRF, distinct stable keys and SOLO", async () => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
  });
  const originalFetch = globalThis.fetch;
  try {
    const { createHomeApi } = await server.ssrLoadModule(
      "/src/features/home/api/homeApi.js",
    );
    const { createTransportAttempt, submitTransportChoice } =
      await server.ssrLoadModule("/src/features/home/utils/busChoice.js");
    const attempt = createTransportAttempt(
      {
        pickupPoint: { id: "11" },
        dropoff: { latitude: 37.33, longitude: 127.27 },
        travelOptions: { destinationDongId: "31" },
      },
      "SOLO",
    );
    const calls = [];
    const journey = {
      id: "201",
      pickupPointId: "11",
      destinationDongId: "31",
      intendedDepartureAt: attempt.body.intendedDepartureAt,
      outcome: "UNRESOLVED",
      activeRequestId: null,
    };
    globalThis.fetch = async (url, options) => {
      calls.push({ url, options });
      return new Response(
        JSON.stringify({
          data: {
            ...journey,
            outcome: options.method === "PUT" ? "SOLO_SELECTED" : "UNRESOLVED",
          },
        }),
        { status: options.method === "PUT" ? 200 : 201 },
      );
    };
    const signal = new AbortController().signal;
    const result = await submitTransportChoice(
      createHomeApi("csrf-test", signal),
      attempt,
    );
    assert.equal(result.outcome, "SOLO_SELECTED");
    assert.equal(calls.length, 2);
    assert.ok(calls[0].url.endsWith("/api/v1/journeys"));
    assert.ok(calls[1].url.endsWith("/api/v1/journeys/201/choice"));
    assert.equal(calls[0].options.method, "POST");
    assert.equal(calls[1].options.method, "PUT");
    assert.deepEqual(JSON.parse(calls[0].options.body), attempt.body);
    assert.deepEqual(JSON.parse(calls[1].options.body), { mode: "SOLO" });
    for (const { options } of calls) {
      assert.equal(options.credentials, "include");
      assert.equal(options.headers["X-CSRF-Token"], "csrf-test");
      assert.equal(options.signal, signal);
    }
    assert.equal(
      calls[0].options.headers["Idempotency-Key"],
      attempt.createKey,
    );
    assert.equal(
      calls[1].options.headers["Idempotency-Key"],
      attempt.choiceKey,
    );
    assert.notEqual(attempt.createKey, attempt.choiceKey);
  } finally {
    globalThis.fetch = originalFetch;
    await server.close();
  }
});
