import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

test("mock mode only follows the API environment; old demo URLs and saved state cannot activate it", async () => {
  const originalWindow = globalThis.window;
  const originalStorage = globalThis.sessionStorage;
  globalThis.window = { location: { search: "?demo=member" } };
  globalThis.sessionStorage = {
    getItem: () => {
      throw new Error("legacy demo state must not be read");
    },
    setItem: () => {
      throw new Error("demo state must not be persisted");
    },
  };
  try {
    for (const [development, baseUrl, expected] of [
      [true, "", true],
      [true, "https://api.example.test", false],
      [false, "", false],
    ]) {
      const server = await createServer({
        server: { middlewareMode: true, hmr: false },
        appType: "custom",
        define: {
          "import.meta.env.DEV": JSON.stringify(development),
          "import.meta.env.VITE_API_BASE_URL": JSON.stringify(baseUrl),
        },
      });
      try {
        const { isMockMode } = await server.ssrLoadModule(
          "/src/shared/api/mockMode.js",
        );
        const { useMockJourneyStore } = await server.ssrLoadModule(
          "/src/features/matching/stores/mockJourneyStore.js",
        );
        assert.equal(isMockMode(), expected);
        assert.equal(useMockJourneyStore.getState().journey, null);
        if (expected) {
          const { default: SchoolVerification } = await server.ssrLoadModule(
            "/src/features/onboarding/pages/SchoolVerification.jsx",
          );
          const html = renderToStaticMarkup(
            createElement(
              MemoryRouter,
              null,
              createElement(SchoolVerification),
            ),
          );
          assert.match(html, /value=""/);
          assert.doesNotMatch(
            html,
            /value="[^"]+@|value="123456"|인증 코드 6자리/,
          );
          const { default: ChatRoom } = await server.ssrLoadModule(
            "/src/features/chat/pages/ChatRoom.jsx",
          );
          assert.ok(ChatRoom);
        }
      } finally {
        await server.close();
      }
    }
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalStorage === undefined) delete globalThis.sessionStorage;
    else globalThis.sessionStorage = originalStorage;
  }
});
