import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

test("demand screen renders real-map container, filters, legend, highlighted contribution and ranked cards", async () => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
    define: {
      "import.meta.env.DEV": "true",
      "import.meta.env.VITE_API_BASE_URL": '""',
    },
  });
  try {
    const { default: DemandMap } = await server.ssrLoadModule(
      "/src/features/demand/pages/DemandMap.jsx",
    );
    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ["/demand-map"] },
        createElement(DemandMap),
      ),
    );
    for (const text of [
      "수요 지도",
      "요일 선택",
      "시간대 선택",
      "심야 귀가 수요 지도",
      "내 구간이 노선 후보 3위예요",
      "주 142회",
      "주 88회",
      "내 귀가가 반영된 구간",
    ])
      assert.ok(html.includes(text), text);
    assert.match(html, /aria-pressed="true"/);
    assert.doesNotMatch(html, /QA:|지도 영역|미리보기/);
  } finally {
    await server.close();
  }
});
