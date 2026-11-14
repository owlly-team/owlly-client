import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { representativeSettlementMock } from "../mocks/memberSettlementMock.js";
import { toRepresentativeRefundView } from "../utils/representativeSettlementUtils.js";
import { loadRefundRecipientAccount } from "../utils/refundRecipientAccount.js";

test("대표는 API-33 금액을 합산하고 각 REFUND 이체의 API-32로 멤버 계좌를 조회한다", async () => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
  });
  const originalFetch = globalThis.fetch;
  try {
    const { createMatchingApi } = await server.ssrLoadModule(
      "/src/features/matching/api/matchingApi.js",
    );
    const { createChatApi } = await server.ssrLoadModule(
      "/src/features/chat/api/chatApi.js",
    );
    let registered = false;
    let expired = false;
    const calls = [];
    globalThis.fetch = async (url, options) => {
      calls.push(url);
      assert.equal(options.method, "GET");
      assert.equal(options.credentials, "include");
      assert.equal(options.cache, "no-store");
      assert.equal(options.body, undefined);
      if (url.endsWith("/api/v1/parties/401/settlement"))
        return new Response(
          JSON.stringify({ data: representativeSettlementMock }),
          { status: 200 },
        );
      const match = url.match(
        /\/api\/v1\/transfers\/(802|804)\/recipient-account$/,
      );
      assert.ok(match);
      assert.equal(options.headers["X-CSRF-Token"], undefined);
      assert.equal(options.headers["Idempotency-Key"], undefined);
      if (expired)
        return new Response(
          JSON.stringify({ error: { code: "ACCOUNT_EXPIRED" } }),
          { status: 410 },
        );
      if (!registered)
        return new Response(
          JSON.stringify({ error: { code: "ACCOUNT_NOT_REGISTERED" } }),
          { status: 409 },
        );
      return new Response(
        JSON.stringify({
          data: {
            accountId: match[1] === "802" ? "1201" : "1202",
            purpose: "REFUND_RECEIVE",
            bankCode: "090",
            accountNumber: match[1] === "802" ? "00001111" : "00002222",
            maskedHolderName: "김*연",
          },
        }),
        { status: 200 },
      );
    };
    const data = (await createMatchingApi("unused").settlement("401")).data;
    const view = toRepresentativeRefundView(data, "401");
    assert.equal(view.totalWon, 1150);
    const api = createChatApi("unused");
    await assert.rejects(
      loadRefundRecipientAccount(api, view.refunds[0].transferId),
      { status: 409, code: "ACCOUNT_NOT_REGISTERED" },
    );
    registered = true;
    const accounts = await Promise.all(
      view.refunds.map((member) =>
        loadRefundRecipientAccount(api, member.transferId),
      ),
    );
    assert.deepEqual(
      accounts.map((account) => account.accountNumber),
      ["00001111", "00002222"],
    );
    assert.equal(
      calls.filter((url) => url.includes("recipient-account")).length,
      3,
    );
    expired = true;
    await assert.rejects(loadRefundRecipientAccount(api, "802"), {
      status: 410,
    });
  } finally {
    globalThis.fetch = originalFetch;
    await server.close();
  }
});
