import { getMemberSettlementPreview } from "../mocks/memberSettlementMock.js";

export function resolveMemberSettlementData({ partyId, state, search = "" }) {
  const party = state?.matchingResult?.party;
  const preview = !state?.memberSettlement && !party && partyId === "401";
  const data = preview
    ? getMemberSettlementPreview(new URLSearchParams(search).get("preview"))
    : state?.memberSettlement;
  if (
    party &&
    (party.id !== partyId ||
      party.myMemberId !== data?.myMemberId ||
      party.representativeMemberId !== data?.representativeMemberId)
  ) {
    return { data: null, isPreview: false };
  }
  return { data, isPreview: preview || state?.isPreview === true };
}

export const formatSettlementWon = (value) =>
  `${value.toLocaleString("ko-KR")}원`;

export function toMemberSettlementView(data, partyId) {
  if (
    !data ||
    data.partyId !== partyId ||
    !data.myMemberId ||
    !data.representativeMemberId ||
    data.myMemberId === data.representativeMemberId ||
    !Number.isSafeInteger(data.totalFareWon) ||
    data.totalFareWon < 0 ||
    !Array.isArray(data.items) ||
    data.items.some(
      (item) =>
        !item.memberId ||
        !Number.isSafeInteger(item.confirmedWon) ||
        item.confirmedWon < 0 ||
        (item.paidWon != null &&
          (!Number.isSafeInteger(item.paidWon) || item.paidWon < 0)) ||
        (item.differenceWon != null &&
          !Number.isSafeInteger(item.differenceWon)),
    ) ||
    new Set(data.items.map((item) => item.memberId)).size !== data.items.length
  )
    return null;
  const mine = data.items.find((item) => item.memberId === data.myMemberId);
  if (!mine || !Number.isSafeInteger(mine.differenceWon)) return null;
  const account = data.representativeAccount;
  const representativeAccount =
    account?.memberId === data.representativeMemberId &&
    typeof account.bankName === "string" &&
    account.bankName.trim() &&
    typeof account.accountNumber === "string" &&
    /^\d[\d-]*\d$/.test(account.accountNumber)
      ? account
      : null;
  return {
    title: data.title,
    totalFare: formatSettlementWon(data.totalFareWon),
    differenceWon: mine.differenceWon,
    amount: formatSettlementWon(Math.abs(mine.differenceWon)),
    amountWon: Math.abs(mine.differenceWon),
    representativeAccount,
    representativeName:
      account?.memberId === data.representativeMemberId
        ? account.maskedHolderName
        : null,
    confirmed: formatSettlementWon(mine.confirmedWon),
    paid: mine.paidWon == null ? "-" : formatSettlementWon(mine.paidWon),
    rows: data.items.map((item) => ({
      memberId: item.memberId,
      name: item.memberId === data.myMemberId ? "나" : item.name,
      note: item.note,
      confirmed: formatSettlementWon(item.confirmedWon),
      received: item.paidWon == null ? "-" : formatSettlementWon(item.paidWon),
      refund:
        item.differenceWon == null
          ? "-"
          : `${item.differenceWon > 0 ? "+" : ""}${formatSettlementWon(item.differenceWon)}`,
      isAdditionalPayment: item.differenceWon < 0,
    })),
  };
}

export function normalizeRefundAccount(bankCode, accountNumber, banks) {
  const number = accountNumber.replace(/[\s-]/g, "");
  if (
    !banks.some((bank) => bank.code === bankCode) ||
    !/^\d{8,16}$/.test(number)
  )
    return null;
  return { bankCode, accountNumber: number };
}
