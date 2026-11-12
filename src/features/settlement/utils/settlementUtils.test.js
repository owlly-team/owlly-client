import test from "node:test";
import assert from "node:assert/strict";
import {
  memberSettlementMock,
  representativeSettlementMock,
} from "../mocks/memberSettlementMock.js";
import {
  formatDistance,
  getPrepaidWon,
  getSettlementItems,
  toSettlementRows,
} from "./settlementUtils.js";
import { toMemberSettlementView } from "./memberSettlementUtils.js";
import {
  resolveRepresentativeSettlement,
  toRepresentativeRefundView,
} from "./representativeSettlementUtils.js";

test("변경된 응답만으로 이름·거리·본인·대표와 최종 금액을 표시한다", () => {
  const data = {
    ...memberSettlementMock,
    items: [
      {
        ...memberSettlementMock.items[0],
        isMe: true,
        prepayDueWon: 6000,
        refundDueWon: 1000,
        transfers: [
          { ...memberSettlementMock.items[0].transfers[0], amountWon: 6000 },
        ],
      },
      {
        ...memberSettlementMock.items[2],
        estimatedShareWon: 25000,
        actualShareWon: 25000,
      },
    ],
  };
  const view = toMemberSettlementView(data, "401");
  assert.equal(view.myMemberId, "501");
  assert.equal(view.totalFare, "30,000원");
  assert.equal(view.confirmed, "5,000원");
  assert.equal(view.paid, "6,000원");
  assert.equal(view.amount, "1,000원");
  assert.deepEqual(
    view.rows.map((row) => [row.name, row.note]),
    [
      ["나", "8km 구간"],
      ["이*준 · 대표", "16km 구간"],
    ],
  );
  assert.equal(view.representativeAccount, null);
});

test("보낸 금액은 선송금 내역에서 구하고 받은 금액은 RECEIVED만 합산한다", () => {
  const base = memberSettlementMock.items[0];
  const transfer = base.transfers[0];
  const item = {
    ...base,
    prepayDueWon: 99999,
    transfers: [
      { ...transfer, id: "1", amountWon: 1000, status: "RECEIVED" },
      { ...transfer, id: "2", amountWon: 2000, status: "SENT" },
      ...["PENDING", "CANCELLED"].map((status, i) => ({
        ...transfer,
        id: String(i + 3),
        status,
      })),
      { ...transfer, id: "5", kind: "REFUND" },
      { ...transfer, id: "6", settlementItemId: "other" },
      { ...transfer, id: "7", payerMemberId: "other" },
      { ...transfer, id: "8", payeeMemberId: "other" },
    ],
  };
  assert.equal(getPrepaidWon(item, "503"), 3000);
  assert.equal(getPrepaidWon(item, "503", true), 1000);
  assert.equal(getPrepaidWon({ ...item, transfers: [] }, "503"), 0);
  assert.equal(getPrepaidWon({ ...item, transfers: null }, "503"), null);
  assert.equal(
    getPrepaidWon({ ...item, transfers: [transfer, transfer] }, "503"),
    null,
  );
});

test("예상 금액은 최종 정산 성공으로 표시하지 않고 0과 누락을 구분한다", () => {
  const estimated = {
    ...memberSettlementMock,
    actualTotalWon: null,
    items: memberSettlementMock.items.map((item) => ({
      ...item,
      actualShareWon: null,
      refundDueWon: null,
    })),
  };
  assert.equal(toMemberSettlementView(estimated, "401"), null);
  assert.equal(
    toSettlementRows(estimated, { partyId: "401" })[0].confirmed,
    "5,000원",
  );
  assert.equal(
    toSettlementRows(estimated, { partyId: "401", final: true })[0].confirmed,
    "-",
  );
  const zero = {
    ...memberSettlementMock,
    actualTotalWon: 0,
    items: memberSettlementMock.items.map((item) => ({
      ...item,
      actualShareWon: 0,
      refundDueWon: 0,
    })),
  };
  assert.equal(toMemberSettlementView(zero, "401").amountWon, 0);
  assert.equal(formatDistance(0), "0km");
  assert.equal(formatDistance(8500), "8.5km");
  assert.equal(formatDistance(null), null);
});

test("다른 팟·중복 ID·중복 본인·중복 대표는 금액 조회에 사용하지 않는다", () => {
  assert.deepEqual(getSettlementItems(memberSettlementMock, "999"), []);
  for (const items of [
    [...memberSettlementMock.items, memberSettlementMock.items[0]],
    memberSettlementMock.items.map((item) => ({ ...item, isMe: true })),
    memberSettlementMock.items.map((item) => ({
      ...item,
      isRepresentative: true,
    })),
  ])
    assert.equal(
      toMemberSettlementView({ ...memberSettlementMock, items }, "401"),
      null,
    );
});

test("대표 반환 합계는 응답의 refundDueWon을 사용하고 계좌는 별도 memberId로 연결한다", () => {
  const account = {
    partyId: "401",
    memberId: "502",
    bankName: "은행",
    accountNumber: "0012345678",
  };
  const view = toRepresentativeRefundView(representativeSettlementMock, "401", {
    refundAccounts: [account],
  });
  assert.equal(view.totalWon, 1150);
  assert.equal(view.refunds[0].account, null);
  assert.equal(view.refunds[1].account, "은행 0012345678");
  for (const bad of [
    { ...account, partyId: "999" },
    { ...account, accountNumber: "1234-****" },
  ]) {
    assert.equal(
      toRepresentativeRefundView(representativeSettlementMock, "401", {
        refundAccounts: [bad],
      }).refunds[1].account,
      null,
    );
  }
  assert.equal(toRepresentativeRefundView(memberSettlementMock, "401"), null);
  assert.equal(resolveRepresentativeSettlement({ partyId: "999" }).data, null);
  assert.equal(
    resolveRepresentativeSettlement({
      partyId: "401",
      state: {
        settlement: { ...representativeSettlementMock, partyId: "999" },
      },
    }).data,
    null,
  );
});
