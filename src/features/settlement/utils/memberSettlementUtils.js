import {
  getMemberSettlementPreview,
  previewRepresentativeAccount,
} from "../mocks/memberSettlementMock.js";
import {
  getSettlementIdentity,
  isFinalSettlement,
  toSettlementRows,
} from "./settlementUtils.js";

export function resolveMemberSettlementData({ partyId, state, search = "" }) {
  const party = state?.matchingResult?.party;
  const supplied =
    state?.memberSettlement ??
    state?.settlement ??
    state?.matchingResult?.settlement;
  const kind = new URLSearchParams(search).get("preview");
  const preview =
    state?.isPreview !== false &&
    supplied == null &&
    !party &&
    partyId === "401";
  const data = preview ? getMemberSettlementPreview(kind) : supplied;
  if (party && !getSettlementIdentity(data, partyId, party)) {
    return { data: null, isPreview: false };
  }
  return {
    data,
    party,
    isPreview: preview || state?.isPreview === true,
    representativeAccount:
      state?.representativeAccount ??
      (preview && kind === "additional" ? previewRepresentativeAccount : null),
  };
}

export const formatSettlementWon = (value) =>
  `${value.toLocaleString("ko-KR")}원`;

export function toMemberSettlementView(
  data,
  partyId,
  { party, representativeAccount: account } = {},
) {
  const identity = getSettlementIdentity(data, partyId, party);
  if (
    !identity ||
    identity.mine.isRepresentative ||
    !isFinalSettlement(data, partyId)
  )
    return null;
  const { mine, representative } = identity;
  const rows = toSettlementRows(data, { partyId, party, final: true });
  const myRow = rows.find((row) => row.memberId === mine.memberId);
  const representativeAccount =
    account?.memberId === representative.memberId &&
    typeof account.bankName === "string" &&
    account.bankName.trim() &&
    typeof account.accountNumber === "string" &&
    /^\d[\d-]*\d$/.test(account.accountNumber)
      ? account
      : null;
  return {
    myMemberId: mine.memberId,
    totalFare: formatSettlementWon(data.actualTotalWon),
    differenceWon: mine.refundDueWon,
    amount: formatSettlementWon(Math.abs(mine.refundDueWon)),
    amountWon: Math.abs(mine.refundDueWon),
    representativeAccount,
    representativeName: representative.maskedName,
    confirmed: myRow.confirmed,
    paid: myRow.received,
    rows,
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
