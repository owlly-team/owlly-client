import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

test("API-33은 단계마다 새로 조회하며 선입금 화면은 API 금액을 재계산하지 않는다", async () => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
  });
  const originalFetch = globalThis.fetch;
  let session;
  try {
    const { createMatchingApi } = await server.ssrLoadModule(
      "/src/features/matching/api/matchingApi.js",
    );
    const { loadMatchingResult } = await server.ssrLoadModule(
      "/src/features/matching/utils/partyFlow.js",
    );
    const { default: Screen } = await server.ssrLoadModule(
      "/src/features/chat/pages/MemberPrepayScreen.jsx",
    );
    session = (await server.ssrLoadModule("/src/shared/stores/sessionStore.js"))
      .default;
    session
      .getState()
      .setSession({ user: { id: "101" }, csrfToken: "test-csrf" });
    const party = {
      id: "401",
      myMemberId: "502",
      representativeMemberId: "503",
      routeVersion: 1,
      members: [
        { memberId: "502", decision: "ACCEPTED" },
        { memberId: "503", decision: "ACCEPTED", maskedName: "대표" },
      ],
    };
    const statuses = ["ESTIMATED", "PREPAYING", "REFUNDING"];
    let calls = 0;
    globalThis.fetch = async (url, options) => {
      if (url.endsWith("/api/v1/parties/401"))
        return new Response(JSON.stringify({ data: party }), {
          status: 200,
          headers: { ETag: '"p1"' },
        });
      assert.ok(url.endsWith("/api/v1/parties/401/settlement"));
      assert.equal(options.cache, "no-store");
      const status = statuses[calls++];
      return new Response(
        JSON.stringify({
          data: {
            id: "901",
            partyId: "401",
            routeVersion: 1,
            status,
            actualTotalWon: status === "REFUNDING" ? 20000 : null,
            items: [
              {
                id: "1002",
                memberId: "502",
                isMe: true,
                isRepresentative: false,
                estimatedShareWon: 7900,
                prepayDueWon: 9600,
                actualShareWon: status === "REFUNDING" ? 8000 : null,
                refundDueWon: status === "REFUNDING" ? 1600 : null,
                transfers: [],
              },
            ],
          },
        }),
        { status: 200, headers: { ETag: `"s${calls}"` } },
      );
    };
    const api = createMatchingApi("test-csrf");
    for (const status of statuses) {
      const context = await loadMatchingResult(api, "401", {
        includeBanks: false,
      });
      assert.equal(context.settlement.status, status);
      assert.equal(context.settlementEtag, `"s${calls}"`);
      const markup = renderToStaticMarkup(
        createElement(Screen, {
          party,
          settlement: context.settlement,
          isPreview: false,
        }),
      );
      assert.match(markup, /9,600원/);
      assert.match(markup, /7,900원/);
      assert.doesNotMatch(markup, /9,500원/);
      const missing = renderToStaticMarkup(
        createElement(Screen, {
          party,
          settlement: {
            ...context.settlement,
            items: context.settlement.items.map((item) => ({
              ...item,
              prepayDueWon: null,
            })),
          },
          isPreview: false,
        }),
      );
      assert.match(missing, /금액 미정/);
      assert.doesNotMatch(missing, /9,500원/);
    }
    assert.equal(calls, 3);
  } finally {
    globalThis.fetch = originalFetch;
    session?.getState().clearSession();
    await server.close();
  }
});
