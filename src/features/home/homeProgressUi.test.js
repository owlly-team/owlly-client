import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

test("ongoing return tab and whole-card button enter chat, finalized home restores registration and step styles remain opt-in", async () => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
    plugins: [
      {
        name: "capture-home-navigation",
        enforce: "pre",
        transform(code, id) {
          const path = id.replaceAll("\\", "/");
          if (path.endsWith("/src/features/home/hooks/useHome.js"))
            return code.replace(
              'import { useNavigate } from "react-router-dom";',
              "const useNavigate = () => globalThis.__owllyHomeNavigate;",
            );
          if (path.endsWith("/src/shared/hooks/useBottomTabNavigation.js"))
            return code.replace(
              'import { useLocation, useNavigate } from "react-router-dom";',
              'const useNavigate = () => globalThis.__owllyHomeNavigate; const useLocation = () => ({ pathname: "/home" });',
            );
        },
      },
    ],
  });
  const previousNavigate = globalThis.__owllyHomeNavigate;
  const calls = [];
  globalThis.__owllyHomeNavigate = (...args) => calls.push(args);
  try {
    const { default: useHome } = await server.ssrLoadModule(
      "/src/features/home/hooks/useHome.js",
    );
    const { default: Home } = await server.ssrLoadModule(
      "/src/features/home/pages/Home.jsx",
    );
    const { default: Card } = await server.ssrLoadModule(
      "/src/features/home/components/HomeRideProgress.jsx",
    );
    const { default: RouteSteps } = await server.ssrLoadModule(
      "/src/features/home/components/RouteSteps.jsx",
    );
    const { homeScenarios } = await server.ssrLoadModule(
      "/src/features/home/mocks/homeMockData.js",
    );
    const { toRideProgressView } = await server.ssrLoadModule(
      "/src/features/home/utils/rideProgressView.js",
    );
    let input = { ...homeScenarios.inProgress, isPreview: false };
    let home;
    function Probe() {
      home = useHome(input);
      return null;
    }
    renderToStaticMarkup(createElement(Probe));
    home.handleTabChange("return");
    assert.equal(calls.at(-1)[0], `/rooms/${input.party.roomId}`);
    assert.equal(calls.at(-1)[1].state.isPreview, false);
    home.handleOpenRoom();
    assert.deepEqual(calls.at(-1), calls.at(-2));
    input = { ...input, party: { ...input.party, roomId: null } };
    renderToStaticMarkup(createElement(Probe));
    home.handleTabChange("return");
    assert.equal(calls.at(-1)[0], `/parties/${input.party.id}/room`);
    const cardHtml = renderToStaticMarkup(
      createElement(Card, { view: toRideProgressView(input), onOpenRoom() {} }),
    );
    assert.equal((cardHtml.match(/<button/g) ?? []).length, 1);
    assert.match(cardHtml, /aria-label="[^"]*동승 채팅방으로 이동"/);
    assert.match(cardHtml, /absolute inset-0/);
    assert.match(cardHtml, /aria-current="step"/);
    const otherSteps = renderToStaticMarkup(
      createElement(RouteSteps, {
        steps: [{ time: "23:00", title: "택시로 이동", type: "walk" }],
      }),
    );
    assert.doesNotMatch(otherSteps, /aria-current|opacity-40|ring-2/);
    input = {
      ...input,
      settlement: {
        ...input.settlement,
        status: "REFUNDING",
        finalizedAt: "2026-11-10T00:10:00+09:00",
      },
    };
    renderToStaticMarkup(createElement(Probe));
    assert.equal(home.isRideInProgress, false);
    assert.equal(
      home.viewData.matchingDisplay.matchedCompanionCount,
      undefined,
    );
    assert.equal(home.viewData.matchingDisplay.estimatedShareWon, undefined);
    home.handleTabChange("return");
    assert.equal(calls.at(-1)[0], "/pickup");
    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(Home, { data: { ...input, isPreview: true } }),
      ),
    );
    assert.doesNotMatch(html, /진행 중인 동승|오늘 귀가 순서/);
    assert.match(html, /귀가 방법 비교/);
  } finally {
    if (previousNavigate === undefined) delete globalThis.__owllyHomeNavigate;
    else globalThis.__owllyHomeNavigate = previousNavigate;
    await server.close();
  }
});
