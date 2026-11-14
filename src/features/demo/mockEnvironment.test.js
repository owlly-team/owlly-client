import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

test("an empty API URL starts a continuous mock session only in development", async () => {
  const originalWindow = globalThis.window;
  const originalStorage = globalThis.sessionStorage;
  const originalFetch = globalThis.fetch;
  try {
    for (const [development, baseUrl, expected, previousAutoMock] of [
      [true, "", true],
      [true, "https://api.example.test", false],
      [false, "", false],
      [true, "https://api.example.test", false, true],
    ]) {
      const values = new Map();
      if (previousAutoMock)
        values.set(
          "owlly-demo-v1",
          JSON.stringify({
            autoMock: true,
            role: "representative",
            home: { isPreview: true },
          }),
        );
      globalThis.window = { location: { search: "" } };
      globalThis.sessionStorage = {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
        removeItem: (key) => values.delete(key),
      };
      let requests = 0;
      globalThis.fetch = () => {
        requests++;
        throw new Error("unexpected network request");
      };
      const server = await createServer({
        server: { middlewareMode: true, hmr: false },
        appType: "custom",
        define: {
          "import.meta.env.DEV": JSON.stringify(development),
          "import.meta.env.VITE_API_BASE_URL": JSON.stringify(baseUrl),
        },
      });
      try {
        const { useMockApi } = await server.ssrLoadModule(
          "/src/shared/api/client.js",
        );
        const { useDemoStore } = await server.ssrLoadModule(
          "/src/features/demo/demoStore.js",
        );
        assert.equal(useMockApi, expected);
        assert.equal(Boolean(useDemoStore.getState().session), expected);
        if (expected) {
          for (const [path, entry, label] of [
            ["home/pages/Home", "/", "귀가 방법 비교"],
            ["home/pages/LastTrain", "/train", "막차로 갈게요"],
            ["home/pages/SoloTaxi", "/solo-taxi", "혼자 택시로 갈게요"],
          ]) {
            const { default: Page } = await server.ssrLoadModule(
              `/src/features/${path}.jsx`,
            );
            const html = renderToStaticMarkup(
              createElement(
                MemoryRouter,
                { initialEntries: [entry] },
                createElement(Page),
              ),
            );
            assert.ok(html.includes(label));
          }
          assert.equal(requests, 0);
          assert.ok(values.has("owlly-demo-v1"));
        }
      } finally {
        await server.close();
      }
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalStorage === undefined) delete globalThis.sessionStorage;
    else globalThis.sessionStorage = originalStorage;
  }
});
