import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { loadPrepayRecipientAccount } from "../utils/recipientAccount.js";
import { getMyPrepayTransferId } from "../utils/prepayUtils.js";

test("API-33 본인 PREPAY로 API-32 GET을 쿠키·no-store로 요청하며 CSRF·멱등 키·본문은 보내지 않는다", async () => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
  });
  const originalFetch = globalThis.fetch;
  try {
    const { createChatApi } = await server.ssrLoadModule(
      "/src/features/chat/api/chatApi.js",
    );
    const party = {
      id: "401",
      myMemberId: "502",
      representativeMemberId: "503",
    };
    const settlement = {
      partyId: "401",
      items: [
        {
          id: "1002",
          memberId: "502",
          transfers: [
            {
              id: "801",
              settlementItemId: "1002",
              kind: "PREPAY",
              payerMemberId: "502",
              payeeMemberId: "503",
              status: "PENDING",
            },
          ],
        },
      ],
    };
    globalThis.fetch = async (url, options) => {
      assert.ok(url.endsWith("/api/v1/transfers/801/recipient-account"));
      assert.equal(options.method, "GET");
      assert.equal(options.credentials, "include");
      assert.equal(options.cache, "no-store");
      assert.equal(options.body, undefined);
      assert.equal(options.headers["X-CSRF-Token"], undefined);
      assert.equal(options.headers["Idempotency-Key"], undefined);
      return new Response(
        JSON.stringify({
          data: {
            accountId: "1201",
            bankCode: "004",
            accountNumber: "000000000000",
            maskedHolderName: "박*표",
            purpose: "PREPAY_RECEIVE",
          },
        }),
        { status: 200 },
      );
    };
    const account = await loadPrepayRecipientAccount(
      createChatApi("unused-csrf"),
      getMyPrepayTransferId(party, settlement),
    );
    assert.equal(account.accountNumber, "000000000000");
    assert.equal(account.maskedHolderName, "박*표");
  } finally {
    globalThis.fetch = originalFetch;
    await server.close();
  }
});
