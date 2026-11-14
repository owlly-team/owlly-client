import { getSettlementItems } from "../../settlement/utils/settlementUtils.js";

export function getPrepayAmount(item) {
  if (Number.isSafeInteger(item?.prepayDueWon) && item.prepayDueWon >= 0)
    return item.prepayDueWon;
  if (
    !Number.isSafeInteger(item?.estimatedShareWon) ||
    item.estimatedShareWon < 0
  )
    return null;
  return Math.ceil((item.estimatedShareWon * 12) / 1000) * 100;
}

// API 응답은 기존 정산 모델과 동일하게 camelCase 필드를 사용한다.
export function getMyPrepayTransferId(party, settlement) {
  if (
    !party?.myMemberId ||
    !party.representativeMemberId ||
    party.myMemberId === party.representativeMemberId ||
    settlement?.partyId !== party.id
  )
    return null;
  if (
    party.routeVersion != null &&
    party.routeVersion !== settlement?.routeVersion
  )
    return null;
  const item = getSettlementItems(settlement, party.id).find(
    (entry) => entry.memberId === party.myMemberId,
  );
  const transfers = item?.transfers?.filter(
    (transfer) =>
      transfer.kind === "PREPAY" &&
      transfer.payerMemberId === party.myMemberId &&
      transfer.payeeMemberId === party.representativeMemberId &&
      ["PENDING", "SENT", "RECEIVED"].includes(transfer.status) &&
      (transfer.settlementItemId == null ||
        transfer.settlementItemId === item.id) &&
      typeof transfer.id === "string" &&
      /^[1-9][0-9]*$/.test(transfer.id),
  );
  return transfers?.length === 1 ? transfers[0].id : null;
}

export function isGatheringTime(departureAt, now = Date.now()) {
  const departure = Date.parse(departureAt);
  return Number.isFinite(departure) && now >= departure;
}

export function getRoomPhase(party, now, boarding) {
  if (
    boarding ||
    party.taxiCalledAt ||
    ["RIDING", "SETTLING", "COMPLETED"].includes(party.status)
  )
    return "boarding";
  return isGatheringTime(party.departureAt, now) ? "prepay" : "chat";
}
