import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import {
  memberSettlementMock,
  getMemberSettlementPreview,
} from "../mocks/memberSettlementMock.js";
import { registerRefundAccount } from "../utils/refundAccountFlow.js";
import { toMemberSettlementView } from "../utils/memberSettlementUtils.js";
import { getMyPrepayTransferId } from "../../chat/utils/prepayUtils.js";
import { loadPrepayRecipientAccount } from "../../chat/utils/recipientAccount.js";

test("API-33 확정 금액 갱신·API-31 환급 등록 재시도·추가 납부 API-32를 연결한다", async () => {
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
    const party = {
      id: "401",
      roomId: "601",
      myMemberId: "502",
      representativeMemberId: "503",
      routeVersion: 2,
      members: memberSettlementMock.items.map(({ memberId, maskedName }) => ({
        memberId,
        maskedName,
        decision: "ACCEPTED",
      })),
    };
    const own = (data) => ({
      ...data,
      items: data.items.filter((item) => item.isMe),
    });
    const additional = own(getMemberSettlementPreview("additional"));
    const refund = own(memberSettlementMock);
    let current = {
      ...refund,
      actualTotalWon: null,
      finalizedAt: null,
      status: "AWAITING_FARE",
    };
    let registrations = 0;
    let accountError;
    const key = "eb14443a-8bb2-49a0-a201-f60c2d5eb906";
    globalThis.fetch = async (url, options) => {
      assert.equal(options.credentials, "include");
      if (url.endsWith("/api/v1/parties/401/settlement")) {
        assert.equal(options.cache, "no-store");
        return new Response(JSON.stringify({ data: current }), { status: 200 });
      }
      if (url.endsWith("/api/v1/parties/401/room"))
        return new Response(
          JSON.stringify({
            data: { id: "601", partyId: "401", status: "OPEN" },
          }),
          { status: 200 },
        );
      if (url.endsWith("/api/v1/rooms/601/accounts/REFUND_RECEIVE")) {
        assert.equal(options.method, "PUT");
        assert.equal(options.headers["X-CSRF-Token"], "csrf");
        assert.equal(options.headers["Idempotency-Key"], key);
        assert.deepEqual(JSON.parse(options.body), {
          bankCode: "090",
          accountNumber: "000012345678",
          holderName: "테스트",
        });
        if (++registrations === 1) throw new TypeError("response lost");
        return new Response(
          JSON.stringify({
            data: {
              id: "1201",
              purpose: "REFUND_RECEIVE",
              bankCode: "090",
              maskedAccountNumber: "********5678",
              maskedHolderName: "테*트",
              deleteAfter: null,
            },
          }),
          { status: 200 },
        );
      }
      assert.ok(url.endsWith("/api/v1/transfers/803/recipient-account"));
      assert.equal(options.method, "GET");
      assert.equal(options.cache, "no-store");
      assert.equal(options.body, undefined);
      if (accountError)
        return new Response(
          JSON.stringify({ error: { code: "ACCOUNT_EXPIRED" } }),
          { status: 410 },
        );
      return new Response(
        JSON.stringify({
          data: {
            accountId: "1202",
            purpose: "PREPAY_RECEIVE",
            bankCode: "004",
            accountNumber: "00001234",
            maskedHolderName: "이*준",
          },
        }),
        { status: 200 },
      );
    };
    const api = createMatchingApi("csrf");
    assert.equal(
      toMemberSettlementView((await api.settlement("401")).data, "401", {
        party,
      }),
      null,
    );
    current = refund;
    let view = toMemberSettlementView(
      (await api.settlement("401")).data,
      "401",
      { party },
    );
    assert.equal(view.amount, "750원");
    assert.equal(view.confirmed, "8,750원");
    assert.equal(view.rows.length, 1);
    const setup = {
      roomId: "601",
      banks: [{ code: "090", name: "카카오뱅크" }],
      holderName: "테스트",
    };
    const account = { bankCode: "090", accountNumber: "000012345678" };
    await assert.rejects(
      registerRefundAccount(
        api,
        { party, settlement: refund },
        setup,
        account,
        key,
      ),
      /response lost/,
    );
    const saved = await registerRefundAccount(
      api,
      { party, settlement: refund },
      setup,
      account,
      key,
    );
    assert.equal(saved.purpose, "REFUND_RECEIVE");
    assert.equal(registrations, 2);
    current = additional;
    const data = (await api.settlement("401")).data;
    view = toMemberSettlementView(data, "401", { party });
    assert.equal(view.differenceWon, -3350);
    const recipient = await loadPrepayRecipientAccount(
      createChatApi("csrf"),
      getMyPrepayTransferId(party, data),
    );
    assert.equal(recipient.accountNumber, "00001234");
    accountError = true;
    await assert.rejects(
      loadPrepayRecipientAccount(createChatApi("csrf"), "803"),
      { status: 410, code: "ACCOUNT_EXPIRED" },
    );
  } finally {
    globalThis.fetch = originalFetch;
    await server.close();
  }
});
