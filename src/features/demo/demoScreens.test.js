import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Routes, Route } from "react-router-dom";

test("demo screens render both roles through registration, confirmation, prepay and settlement without fetch", async () => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
    plugins: [
      {
        name: "static-test-portals",
        enforce: "pre",
        transform(code, id) {
          if (!id.includes("/src/")) return;
          // Closed dialogs live in portals; only the visible page is rendered by this smoke test.
          return code.replace(
            'import { createPortal } from "react-dom";',
            "const createPortal = () => null;",
          );
        },
      },
    ],
  });
  const originalFetch = globalThis.fetch;
  const originalDocument = globalThis.document;
  globalThis.document = { body: {} };
  const requests = [];
  globalThis.fetch = (...args) => {
    requests.push(args);
    throw new Error("A demo must not fetch server data");
  };
  try {
    const { useDemoStore } = await server.ssrLoadModule(
      "/src/features/demo/demoStore.js",
    );
    const { receiveDemoPrepayments, finalizeDemoSettlement } =
      await server.ssrLoadModule("/src/features/demo/demoFlow.js");
    const { createMockRegistration } = await server.ssrLoadModule(
      "/src/features/matching/mocks/matchingMockData.js",
    );
    const loadPage = async (path) =>
      (await server.ssrLoadModule(`/src/features/${path}.jsx`)).default;
    const Home = await loadPage("home/pages/Home");
    const Registration = await loadPage("matching/pages/CarpoolRegistration");
    const Matching = await loadPage("matching/pages/MatchingResult");
    const Chat = await loadPage("chat/pages/ChatRoom");
    const Input = await loadPage("settlement/pages/SettlementInput");
    const Refund = await loadPage("settlement/pages/SettlementRefund");
    const Member = await loadPage("settlement/pages/MemberSettlement");
    function render(Page, path, pattern = path, state) {
      // Static rendering reads Zustand's initial snapshot rather than subscribing like the client.
      useDemoStore.getInitialState().session = useDemoStore.getState().session;
      return renderToStaticMarkup(
        createElement(
          MemoryRouter,
          { initialEntries: [{ pathname: path, state }] },
          createElement(
            Routes,
            null,
            createElement(Route, {
              path: pattern,
              element: createElement(Page),
            }),
          ),
        ),
      );
    }
    for (const role of ["representative", "member"]) {
      useDemoStore.getState().reset(role);
      assert.match(render(Home, "/"), /귀가 방법 비교/);
      const pickupPoint = useDemoStore.getState().session.home.pickupPoint;
      const selection = {
        pickupPoint,
        destination: { id: "31", name: "영통2동" },
      };
      useDemoStore
        .getState()
        .register(
          createMockRegistration(
            { departureAt: "2026-11-09T23:30:00+09:00", waitingCount: 2 },
            selection,
          ),
          selection,
        );
      assert.match(render(Home, "/"), /매칭 대기 중/);
      assert.match(render(Registration, "/carpool-registration"), /등록 취소/);
      useDemoStore.getState().match();
      assert.match(render(Home, "/"), /매칭됐어요/);
      assert.match(
        render(Matching, "/matching/result/401", "/matching/result/:partyId"),
        /매칭됐어요/,
      );
      const context = useDemoStore.getState().session.matchingResult;
      useDemoStore.getState().updateParty({
        ...context.party,
        status: "PREPAYING",
        members: context.party.members.map((member) => ({
          ...member,
          decision: "ACCEPTED",
        })),
      });
      const ongoingHome = render(Home, "/");
      assert.match(ongoingHome, /진행 중인 동승/);
      assert.match(ongoingHome, /오늘 귀가 순서/);
      assert.match(ongoingHome, /확인 코드 4821/);
      assert.match(ongoingHome, /채팅방으로/);
      assert.match(ongoingHome, /나 내림/);
      assert.doesNotMatch(ongoingHome, /집까지 마지막 출발|귀가 방법 비교/);
      assert.match(
        ongoingHome,
        role === "representative"
          ? /멤버들의 선입금 확인하기/
          : /대표에게 9,600원 먼저 보내기/,
      );
      if (role === "representative")
        assert.match(
          render(Matching, "/matching/result/401", "/matching/result/:partyId"),
          /받을 계좌/,
        );
      assert.match(
        render(Chat, "/rooms/601", "/rooms/:roomId"),
        /집결까지 30분/,
      );
      useDemoStore.getState().prepay();
      assert.match(
        render(Chat, "/rooms/601", "/rooms/:roomId"),
        role === "representative" ? /택시를 불렀어요/ : /다음: 입금 확인/,
      );
      const current = useDemoStore.getState().session.matchingResult;
      const state = {
        isPreview: true,
        matchingResult: receiveDemoPrepayments(current),
      };
      const settlement = finalizeDemoSettlement(
        current,
        current.settlement.estimatedTotalWon,
      );
      if (role === "representative") {
        assert.match(
          render(
            Input,
            "/parties/401/settlement",
            "/parties/:partyId/settlement",
            state,
          ),
          /정산 확정하기/,
        );
        assert.match(
          render(
            Refund,
            "/parties/401/settlement/refund",
            "/parties/:partyId/settlement/refund",
            { ...state, settlement },
          ),
          /정산 반환 안내/,
        );
      } else {
        assert.match(
          render(
            Member,
            "/parties/401/settlement/result",
            "/parties/:partyId/settlement/result",
            { ...state, memberSettlement: settlement },
          ),
          /정산/,
        );
      }
    }
    assert.equal(requests.length, 0);
    useDemoStore.getState().stop();
    assert.match(render(Home, "/"), /로그인/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
    await server.close();
  }
});
