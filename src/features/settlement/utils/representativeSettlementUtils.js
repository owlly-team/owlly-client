import { representativeSettlementMock } from "../mocks/memberSettlementMock.js";
import { getSettlementIdentity, isFinalSettlement } from "./settlementUtils.js";

export function resolveRepresentativeSettlement({
  partyId,
  state,
  allowPreview = false,
}) {
  const party = state?.matchingResult?.party;
  const supplied = state?.settlement ?? state?.matchingResult?.settlement;
  const preview =
    allowPreview &&
    state?.isPreview === true &&
    supplied == null &&
    partyId === "401";
  const data =
    state?.isPreview === true && !allowPreview
      ? null
      : preview
        ? representativeSettlementMock
        : supplied;
  const identity = getSettlementIdentity(data, partyId, party);
  return {
    data: identity?.mine.isRepresentative ? data : null,
    party,
    isPreview: allowPreview && state?.isPreview === true,
  };
}

export function toRepresentativeRefundView(
  data,
  partyId,
  { party, refundAccounts = [] } = {},
) {
  const identity = getSettlementIdentity(data, partyId, party);
  if (!identity?.mine.isRepresentative || !isFinalSettlement(data, partyId))
    return null;
  const refunds = identity.items
    .filter((item) => !item.isRepresentative && item.refundDueWon > 0)
    .map((item) => {
      // 계좌는 정산 조회 응답에 없으므로 별도 전달된 멤버별 계좌만 사용한다.
      const accounts = refundAccounts.filter(
        (account) =>
          account.partyId === partyId && account.memberId === item.memberId,
      );
      const account = accounts.length === 1 ? accounts[0] : null;
      const accountLabel =
        account?.bankName && /^\d[\d-]*\d$/.test(account.accountNumber ?? "")
          ? `${account.bankName} ${account.accountNumber}`
          : null;
      return {
        memberId: item.memberId,
        name: item.maskedName ?? "이름 미정",
        account: accountLabel,
        amountWon: item.refundDueWon,
        amount: `${item.refundDueWon.toLocaleString("ko-KR")}원`,
        received: item.status === "COMPLETED",
      };
    });
  return {
    refunds,
    totalWon: refunds.reduce((sum, item) => sum + item.amountWon, 0),
  };
}
