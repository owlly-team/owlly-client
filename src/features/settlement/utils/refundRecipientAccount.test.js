import test from "node:test";
import assert from "node:assert/strict";
import { representativeSettlementMock } from "../mocks/memberSettlementMock.js";
import { toRepresentativeRefundView } from "./representativeSettlementUtils.js";
import {
  getRefundTransferId,
  loadRefundRecipientAccount,
  refundRecipientErrorMessage,
} from "./refundRecipientAccount.js";

const item = representativeSettlementMock.items[0];
const refund = item.transfers.find((transfer) => transfer.kind === "REFUND");

test("환급액은 API-33의 양수 차액만 합산하고 멤버별 REFUND 이체로 연결한다", () => {
  const view = toRepresentativeRefundView(representativeSettlementMock, "401");
  assert.equal(view.totalWon, 1150);
  assert.deepEqual(
    view.refunds.map(({ memberId, transferId, amountWon }) => ({
      memberId,
      transferId,
      amountWon,
    })),
    [
      { memberId: "501", transferId: "802", amountWon: 400 },
      { memberId: "502", transferId: "804", amountWon: 750 },
    ],
  );
  for (const difference of [0, -100]) {
    const changed = {
      ...representativeSettlementMock,
      items: representativeSettlementMock.items.map((entry) =>
        entry.memberId === "502"
          ? { ...entry, refundDueWon: difference }
          : entry,
      ),
    };
    const result = toRepresentativeRefundView(changed, "401");
    assert.equal(result.totalWon, 400);
    assert.equal(result.refunds.length, 1);
  }
});

test("누락·중복·다른 항목·방향·금액의 이체와 PREPAY는 계좌 조회에 사용하지 않는다", () => {
  assert.equal(getRefundTransferId(item, "503"), "802");
  for (const status of ["PENDING", "SENT", "RECEIVED"])
    assert.equal(
      getRefundTransferId(
        { ...item, transfers: [{ ...refund, status }] },
        "503",
      ),
      "802",
    );
  for (const transfers of [
    [],
    [refund, refund],
    [{ ...refund, payerMemberId: "501" }],
    [{ ...refund, payeeMemberId: "502" }],
    [{ ...refund, settlementItemId: "other" }],
    [{ ...refund, amountWon: 999 }],
    [{ ...refund, kind: "PREPAY" }],
    [{ ...refund, status: "CANCELLED" }],
  ])
    assert.equal(getRefundTransferId({ ...item, transfers }, "503"), null);
});

test("대표가 조회한 REFUND_RECEIVE 원문만 사용하고 다른 용도 응답은 거부한다", async () => {
  const data = {
    accountId: "1201",
    purpose: "REFUND_RECEIVE",
    bankCode: "090",
    accountNumber: "000012345678",
    maskedHolderName: "김*연",
  };
  const account = await loadRefundRecipientAccount(
    {
      recipientAccount: async (id) => {
        assert.equal(id, "802");
        return { data };
      },
    },
    "802",
  );
  assert.equal(account.accountNumber, "000012345678");
  for (const bad of [
    { ...data, purpose: "PREPAY_RECEIVE" },
    { ...data, accountId: "" },
    { ...data, accountNumber: "****5678" },
    { ...data, bankCode: "" },
  ])
    await assert.rejects(
      loadRefundRecipientAccount(
        { recipientAccount: async () => ({ data: bad }) },
        "802",
      ),
    );
  assert.equal(
    refundRecipientErrorMessage({ code: "ACCOUNT_NOT_REGISTERED" }),
    "반환 계좌 등록 대기",
  );
  assert.match(refundRecipientErrorMessage({ status: 410 }), /조회 기간/);
  assert.match(refundRecipientErrorMessage({ status: 403 }), /권한/);
});
