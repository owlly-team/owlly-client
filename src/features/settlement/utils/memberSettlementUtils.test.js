import test from "node:test";
import assert from "node:assert/strict";
import { memberSettlementMock } from "../mocks/memberSettlementMock.js";
import { BANK_OPTIONS as refundBanks } from "../../../shared/constants/banks.js";
import {
  normalizeRefundAccount,
  toMemberSettlementView,
  resolveMemberSettlementData,
} from "./memberSettlementUtils.js";

test("본인 ID로 정산 항목을 찾고 일반 멤버의 금액을 표시한다", () => {
  const view = toMemberSettlementView(memberSettlementMock, "401");
  assert.equal(view.amount, "750원");
  assert.equal(view.paid, "9,500원");
  assert.equal(view.rows[1].name, "나");
  assert.equal(view.rows[2].refund, "-");
});

test("직접 접근 미리보기 쿼리는 반환·추가 납부·0원 시나리오를 선택한다", () => {
  for (const [search, difference] of [
    ["", 750],
    ["?preview=refund", 750],
    ["?preview=additional", -3350],
    ["?preview=even", 0],
    ["?preview=unknown", 750],
  ]) {
    const result = resolveMemberSettlementData({ partyId: "401", search });
    assert.equal(result.isPreview, true);
    const view = toMemberSettlementView(result.data, "401");
    assert.equal(view.differenceWon, difference);
    if (difference < 0) {
      assert.equal(view.amountWon, 3350);
      assert.equal(view.rows[1].refund, "-3,350원");
      assert.equal(view.rows[1].isAdditionalPayment, true);
      assert.equal(
        view.representativeAccount.accountNumber,
        "943202-01-482917",
      );
    }
  }
});

test("쿼리는 전달된 정산 결과나 역할·팟 검증을 덮어쓰지 않는다", () => {
  const search = "?preview=additional";
  const supplied = resolveMemberSettlementData({
    partyId: "401",
    search,
    state: { memberSettlement: memberSettlementMock },
  });
  assert.equal(supplied.data, memberSettlementMock);
  assert.equal(supplied.isPreview, false);
  for (const party of [
    { id: "999", myMemberId: "502", representativeMemberId: "503" },
    { id: "401", myMemberId: "503", representativeMemberId: "503" },
    { id: "401", myMemberId: "502", representativeMemberId: "999" },
  ]) {
    const resolved = resolveMemberSettlementData({
      partyId: "401",
      search,
      state: {
        memberSettlement: memberSettlementMock,
        matchingResult: { party },
      },
    });
    assert.equal(toMemberSettlementView(resolved.data, "401"), null);
  }
  assert.equal(
    toMemberSettlementView(
      resolveMemberSettlementData({ partyId: "999", search }).data,
      "999",
    ),
    null,
  );
});

test("없는 계좌·다른 멤버 계좌·마스킹된 계좌를 송금 계좌로 대체하지 않는다", () => {
  for (const representativeAccount of [
    null,
    { memberId: "501", bankName: "은행", accountNumber: "1234567890" },
    { memberId: "503", bankName: "은행", accountNumber: "1234-****-5678" },
  ]) {
    const view = toMemberSettlementView(
      { ...memberSettlementMock, representativeAccount },
      "401",
    );
    assert.equal(view.representativeAccount, null);
  }
});

test("다른 팟, 대표, 본인 항목 누락과 금액 누락은 결과로 표시하지 않는다", () => {
  assert.equal(toMemberSettlementView(memberSettlementMock, "999"), null);
  for (const patch of [
    { myMemberId: "503" },
    { myMemberId: "999" },
    { totalFareWon: null },
    {
      items: memberSettlementMock.items.map((item) =>
        item.memberId === "502" ? { ...item, differenceWon: null } : item,
      ),
    },
  ])
    assert.equal(
      toMemberSettlementView({ ...memberSettlementMock, ...patch }, "401"),
      null,
    );
});

test("차액 0원과 추가 납부의 부호를 보존한다", () => {
  for (const differenceWon of [0, -750]) {
    const data = {
      ...memberSettlementMock,
      items: memberSettlementMock.items.map((item) =>
        item.memberId === "502" ? { ...item, differenceWon } : item,
      ),
    };
    const view = toMemberSettlementView(data, "401");
    assert.equal(view.differenceWon, differenceWon);
    assert.equal(view.amount, differenceWon === 0 ? "0원" : "750원");
  }
});

test("계좌 앞자리 0을 유지하고 하이픈·공백만 제거하며 이름은 포함하지 않는다", () => {
  assert.deepEqual(
    normalizeRefundAccount("090", "0012-3456 7890", refundBanks),
    { bankCode: "090", accountNumber: "001234567890" },
  );
  for (const number of [
    "",
    "1234567",
    "12345678901234567",
    "1234abcd5678",
    "1234.5678",
  ]) {
    assert.equal(normalizeRefundAccount("090", number, refundBanks), null);
  }
  assert.equal(
    normalizeRefundAccount("unknown", "12345678", refundBanks),
    null,
  );
});
