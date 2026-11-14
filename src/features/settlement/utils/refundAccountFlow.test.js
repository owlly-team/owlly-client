import test from "node:test";
import assert from "node:assert/strict";
import { memberSettlementMock } from "../mocks/memberSettlementMock.js";
import {
  getRefundOwner,
  loadRefundSetup,
  registerRefundAccount,
  refundAccountErrorMessage,
} from "./refundAccountFlow.js";

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
const mine = memberSettlementMock.items.find((item) => item.isMe);
const settlement = { ...memberSettlementMock, items: [mine] };
const banks = [{ code: "090", name: "카카오뱅크" }];
const setup = { roomId: "601", holderName: "테스트", banks };
const account = { bankCode: "090", accountNumber: "000012345678" };
const masked = {
  id: "1201",
  purpose: "REFUND_RECEIVE",
  bankCode: "090",
  maskedAccountNumber: "********5678",
  maskedHolderName: "테*트",
  deleteAfter: null,
};
const api = {
  room: async () => ({ data: { id: "601", partyId: "401", status: "OPEN" } }),
  profile: async () => ({ data: { realName: "테스트" } }),
  banks: async () => ({ data: banks }),
};

test("일반 멤버 본인 항목만 있는 API-33에서도 환급 계좌 등록 문맥을 복원한다", async () => {
  assert.equal(getRefundOwner(party, settlement), mine);
  assert.deepEqual(await loadRefundSetup(api, party, settlement), setup);
  for (const data of [
    { ...settlement, partyId: "999" },
    { ...settlement, finalizedAt: null },
    { ...settlement, items: [{ ...mine, refundDueWon: 0 }] },
    { ...settlement, items: [{ ...mine, refundDueWon: -1 }] },
  ])
    assert.throws(() => getRefundOwner(party, data));
  await assert.rejects(
    loadRefundSetup(
      { ...api, profile: async () => ({ data: { realName: "테*트" } }) },
      party,
      settlement,
    ),
  );
  await assert.rejects(
    loadRefundSetup(
      { ...api, banks: async () => ({ data: [] }) },
      party,
      settlement,
    ),
  );
});

test("환급 등록은 REFUND_RECEIVE와 프로필 예금주를 전송하고 마스킹 응답만 남긴다", async () => {
  const result = await registerRefundAccount(
    {
      ...api,
      registerAccount: async (...args) => {
        assert.deepEqual(args, [
          "601",
          "REFUND_RECEIVE",
          { ...account, holderName: "테스트" },
          "same-key",
        ]);
        return {
          data: {
            ...masked,
            accountNumber: "서버가 불필요한 원문을 보낸 경우",
          },
        };
      },
    },
    { party, settlement },
    setup,
    account,
    "same-key",
  );
  assert.deepEqual(result, masked);
  assert.equal("accountNumber" in result, false);
  assert.equal("holderName" in result, false);
});

test("다른 방·닫힌 방·역할 불일치와 다른 용도 응답은 등록 성공으로 간주하지 않는다", async () => {
  await assert.rejects(
    registerRefundAccount(
      api,
      { party, settlement },
      { ...setup, roomId: "999" },
      account,
      "key",
    ),
  );
  await assert.rejects(
    registerRefundAccount(
      {
        ...api,
        room: async () => ({
          data: { id: "601", partyId: "401", status: "CLOSED" },
        }),
      },
      { party, settlement },
      setup,
      account,
      "key",
    ),
    { code: "ROOM_ACCESS_EXPIRED" },
  );
  for (const data of [
    { ...masked, purpose: "PREPAY_RECEIVE" },
    { ...masked, bankCode: "other" },
    { ...masked, maskedAccountNumber: "" },
  ])
    await assert.rejects(
      registerRefundAccount(
        { ...api, registerAccount: async () => ({ data }) },
        { party, settlement },
        setup,
        account,
        "key",
      ),
    );
  assert.match(
    refundAccountErrorMessage({ code: "ACCOUNT_LOCKED" }),
    /변경할 수 없어요/,
  );
  assert.match(refundAccountErrorMessage({ code: "ROOM_CLOSED" }), /종료/);
  assert.match(refundAccountErrorMessage({ status: 429 }), /잠시 후/);
});
