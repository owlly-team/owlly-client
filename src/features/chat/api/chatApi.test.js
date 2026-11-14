import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import {
  createMessageCommand,
  validateMessagePage,
} from "../utils/messageFlow.js";

test("API-27 코드, API-28 커서 조회, API-29 쿠키/CSRF/멱등 원문 요청과 서버 마스킹 응답", async () => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
  });
  const originalFetch = globalThis.fetch;
  try {
    const { createChatApi } = await server.ssrLoadModule(
      "/src/features/chat/api/chatApi.js",
    );
    const { createMatchingApi } = await server.ssrLoadModule(
      "/src/features/matching/api/matchingApi.js",
    );
    const api = createChatApi("test-csrf");
    const command = createMessageCommand("010/1234/5678 연락해 주세요");
    let sends = 0;
    globalThis.fetch = async (url, options) => {
      const parsed = new URL(url, "http://localhost");
      assert.equal(options.credentials, "include");
      assert.equal(options.cache, "no-store");
      if (parsed.pathname === "/api/v1/parties/401/room")
        return new Response(
          JSON.stringify({
            data: {
              id: "601",
              partyId: "401",
              verificationCode: "0042",
              status: "OPEN",
              canSendMessage: true,
            },
          }),
          { status: 200 },
        );
      assert.equal(parsed.pathname, "/api/v1/rooms/601/messages");
      const message = {
        id: "701",
        roomId: "601",
        senderMemberId: "501",
        messageType: "USER",
        body: "가려진 번호 연락해 주세요",
        createdAt: "2026-11-14T14:00:00Z",
      };
      if (options.method === "POST") {
        assert.equal(options.headers["X-CSRF-Token"], "test-csrf");
        assert.equal(options.headers["Idempotency-Key"], command.key);
        assert.deepEqual(JSON.parse(options.body), command.body);
        sends++;
        if (sends === 1) throw new TypeError("network failure");
        return new Response(JSON.stringify({ data: message }), { status: 201 });
      }
      assert.equal(options.method, "GET");
      assert.equal(options.headers["X-CSRF-Token"], undefined);
      assert.equal(options.headers["Idempotency-Key"], undefined);
      assert.equal(parsed.searchParams.get("limit"), "50");
      assert.equal(
        parsed.searchParams.has("afterId") &&
          parsed.searchParams.has("beforeId"),
        false,
      );
      if (parsed.searchParams.has("afterId"))
        return new Response(
          JSON.stringify({
            data: [],
            meta: { latestId: null, nextBeforeId: null, hasMore: false },
          }),
          { status: 200 },
        );
      return new Response(
        JSON.stringify({
          data: [message],
          meta: { latestId: "701", nextBeforeId: null, hasMore: false },
        }),
        { status: 200 },
      );
    };
    assert.equal(
      (await createMatchingApi("test-csrf").room("401")).data.verificationCode,
      "0042",
    );
    assert.equal(
      validateMessagePage(await api.messages("601"), "601").latestId,
      "701",
    );
    const query = { afterId: "701" };
    assert.equal(
      validateMessagePage(await api.messages("601", query), "601", query)
        .latestId,
      null,
    );
    await api.messages("601", { beforeId: "702" });
    await assert.rejects(
      api.send("601", command.body, command.key),
      /network failure/,
    );
    const sent = await api.send("601", command.body, command.key);
    assert.equal(sent.data.body, "가려진 번호 연락해 주세요");
    assert.equal(sends, 2);
  } finally {
    globalThis.fetch = originalFetch;
    await server.close();
  }
});
