import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

test("API-15 then API-17 send session cookies, CSRF, exact JSON bodies and stable idempotency headers", async () => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
  });
  const originalFetch = globalThis.fetch;
  const calls = [];
  try {
    const { createHomeApi } = await server.ssrLoadModule(
      "/src/features/home/api/homeApi.js",
    );
    const { default: LastTrain } = await server.ssrLoadModule(
      "/src/features/home/pages/LastTrain.jsx",
    );
    const { loadLastTrain } = await server.ssrLoadModule(
      "/src/features/home/utils/loadLastTrain.js",
    );
    const { createBusAttempt, submitBusChoice } = await server.ssrLoadModule(
      "/src/features/home/utils/busChoice.js",
    );
    const controller = new AbortController();
    const now = Date.parse("2026-11-05T13:30:00Z");
    const attempt = createBusAttempt(
      {
        pickupPoint: { id: "11" },
        dropoff: { latitude: 37.33, longitude: 127.27 },
        travelOptions: {
          destinationDongId: "105",
          transit: { available: true, lastLeaveAt: "2026-11-05T13:49:00Z" },
        },
      },
      now,
    );
    const journey = {
      id: "201",
      universityId: "1",
      pickupPointId: "11",
      destinationDongId: "105",
      intendedDepartureAt: attempt.body.intendedDepartureAt,
      outcome: "UNRESOLVED",
      activeRequestId: null,
    };
    const travelOptions = {
      destinationDongId: "105",
      destinationDongName: "영통2동",
      warnings: ["버스 소요 시간은 추정이에요"],
      transit: {
        available: true,
        totalDurationMin: 43,
        estimatedCostWon: 1550,
        lastLeaveAt: "2026-11-05T13:49:00Z",
        arrivalAt: "2026-11-05T14:41:00Z",
        sourceLabel: "GBIS 시간표 기준",
        legs: [
          {
            mode: "BUS",
            fromName: "단국대정문",
            toName: "영통역8번출구",
            routeName: "720-3",
            stopCount: 41,
            departureAt: "2026-11-05T13:58:00Z",
            arrivalAt: "2026-11-05T14:38:00Z",
            lastBus: true,
          },
        ],
      },
    };
    globalThis.fetch = async (url, options) => {
      calls.push({ url, options });
      return new Response(
        JSON.stringify({
          data: url.endsWith("/travel-options")
            ? travelOptions
            : options.method === "PUT"
              ? { ...journey, outcome: "BUS_SELECTED" }
              : journey,
        }),
        { status: options.method === "PUT" ? 200 : 201 },
      );
    };
    const source = {
      pickupPoint: { id: "11", name: "단국대 정문" },
      dropoff: attempt.body.dropoff,
    };
    const context = await loadLastTrain(
      createHomeApi("test-csrf", controller.signal),
      source,
      "101",
      now,
    );
    const travelCall = calls.shift();
    assert.ok(travelCall.url.endsWith("/api/v1/travel-options"));
    assert.deepEqual(JSON.parse(travelCall.options.body), {
      pickupPointId: "11",
      dropoff: source.dropoff,
      departureAt: new Date(now).toISOString(),
    });
    assert.equal(travelCall.options.credentials, "include");
    assert.equal(travelCall.options.headers["X-CSRF-Token"], "test-csrf");
    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        {
          initialEntries: [
            {
              pathname: "/train",
              state: { isPreview: true, travelContext: context },
            },
          ],
        },
        createElement(LastTrain),
      ),
    );
    assert.match(html, /43분/);
    assert.match(html, /1,550원/);
    assert.match(html, /22:49까지 출발해야 해요/);
    assert.match(html, /720-3/);
    assert.match(html, /41개 정류장/);
    assert.match(html, /막차로 갈게요/);
    assert.match(html, /버스 소요 시간은 추정이에요/);
    assert.equal(calls.length, 0, "preview rendering must not write a journey");
    await submitBusChoice(
      createHomeApi("test-csrf", controller.signal),
      attempt,
    );
    assert.equal(calls.length, 2);
    assert.ok(calls[0].url.endsWith("/api/v1/journeys"));
    assert.ok(calls[1].url.endsWith("/api/v1/journeys/201/choice"));
    assert.equal(calls[0].options.method, "POST");
    assert.equal(calls[1].options.method, "PUT");
    assert.deepEqual(JSON.parse(calls[0].options.body), attempt.body);
    assert.deepEqual(JSON.parse(calls[1].options.body), { mode: "BUS" });
    for (const { options } of calls) {
      assert.equal(options.credentials, "include");
      assert.equal(options.headers["X-CSRF-Token"], "test-csrf");
      assert.equal(options.headers["Content-Type"], "application/json");
      assert.equal(options.signal, controller.signal);
    }
    assert.equal(
      calls[0].options.headers["Idempotency-Key"],
      attempt.createKey,
    );
    assert.equal(
      calls[1].options.headers["Idempotency-Key"],
      attempt.choiceKey,
    );
  } finally {
    globalThis.fetch = originalFetch;
    await server.close();
  }
});
