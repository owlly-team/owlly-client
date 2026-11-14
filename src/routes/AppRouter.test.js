import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

test("Start entry routes remain separate from Home and the home tab is active on /home", async () => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
    define: {
      "import.meta.env.DEV": "true",
      "import.meta.env.VITE_API_BASE_URL": '""',
    },
  });
  try {
    const { AppRoutes } = await server.ssrLoadModule(
      "/src/routes/AppRouter.jsx",
    );
    const render = (path) =>
      renderToStaticMarkup(
        createElement(
          MemoryRouter,
          { initialEntries: [path] },
          createElement(AppRoutes),
        ),
      );
    for (const path of ["/", "/onboarding"]) {
      const html = render(path);
      assert.match(html, /학생으로 시작하기/);
      assert.doesNotMatch(html, /귀가 방법 비교/);
    }
    const home = render("/home");
    assert.match(home, /귀가 방법 비교/);
    assert.doesNotMatch(home, /학생으로 시작하기/);
    const nav = home.match(/<nav[\s\S]*?<\/nav>/)?.[0];
    const active = nav?.match(
      /<button[^>]*aria-pressed="true"[^>]*>[\s\S]*?<\/button>/,
    )?.[0];
    assert.ok(active?.includes("홈</span>"));
    const inProgress = render("/home?preview=home&scenario=inProgress");
    assert.match(inProgress, /오늘 귀가 순서/);
    assert.doesNotMatch(inProgress, /학생으로 시작하기/);
  } finally {
    await server.close();
  }
});

test("an unauthenticated live /home visit shows Home's login state rather than the onboarding Start page", async () => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
    define: {
      "import.meta.env.DEV": "true",
      "import.meta.env.VITE_API_BASE_URL": '"https://api.example.test"',
    },
  });
  try {
    const { AppRoutes } = await server.ssrLoadModule(
      "/src/routes/AppRouter.jsx",
    );
    const { default: session } = await server.ssrLoadModule(
      "/src/shared/stores/sessionStore.js",
    );
    session.getInitialState().status = "guest";
    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ["/home"] },
        createElement(AppRoutes),
      ),
    );
    assert.match(html, /로그인하고 귀가 방법을 확인해 주세요/);
    assert.doesNotMatch(html, /학생으로 시작하기/);
  } finally {
    await server.close();
  }
});
