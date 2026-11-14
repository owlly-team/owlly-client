import {
  formatDistance,
  getSettlementItems,
  isWon,
} from "../../settlement/utils/settlementUtils.js";

function getMatchingSettlementItems(party, settlement) {
  // API-22의 경로가 변경된 뒤 이전 API-33 금액을 함께 표시하지 않는다.
  if (
    party.routeVersion != null &&
    party.routeVersion !== settlement?.routeVersion
  )
    return [];
  return getSettlementItems(settlement, party.id);
}

export function toMatchingResultView(party, settlement) {
  const items = getMatchingSettlementItems(party, settlement);
  const members = party.members
    .filter(
      (member) =>
        !["DECLINED", "LEFT", "REMOVED_UNPAID"].includes(member.decision),
    )
    .toSorted((a, b) => (a.stopOrder ?? Infinity) - (b.stopOrder ?? Infinity))
    .map((member) => {
      const item = items.find((entry) => entry.memberId === member.memberId);
      return {
        ...member,
        maskedName: member.maskedName ?? item?.maskedName,
        isRepresentative:
          Boolean(party.representativeMemberId) &&
          member.memberId === party.representativeMemberId,
        dropoffNote: member.destinationDongName
          ? `${member.destinationDongName}에서 내려요`
          : "하차 구역 확인 중",
        distanceLabel: formatDistance(item?.distanceMeters),
        genderLabel:
          member.gender === "FEMALE"
            ? "여성"
            : member.gender === "MALE"
              ? "남성"
              : undefined,
      };
    });
  const mySettlementItem = items.find(
    (item) => item.memberId === party.myMemberId,
  );
  return {
    isRepresentative:
      Boolean(party.myMemberId) &&
      party.myMemberId === party.representativeMemberId,
    members,
    companionCount: members.filter(
      (member) => member.memberId !== party.myMemberId,
    ).length,
    allSameSchool:
      Boolean(party.pickupPoint?.universityName) &&
      members.every(
        (member) => member.universityName === party.pickupPoint.universityName,
      ),
    destinationLabel:
      party.districtName ??
      members.find((member) => member.memberId === party.myMemberId)
        ?.destinationDongName,
    mySettlementItem,
    estimatedShareWon: isWon(mySettlementItem?.estimatedShareWon)
      ? mySettlementItem.estimatedShareWon
      : null,
    prepayDueWon: isWon(mySettlementItem?.prepayDueWon)
      ? mySettlementItem.prepayDueWon
      : null,
    amountsReady:
      isWon(mySettlementItem?.estimatedShareWon) &&
      isWon(mySettlementItem?.prepayDueWon),
  };
}

export function toRepresentativePayments(party, settlement) {
  const { members } = toMatchingResultView(party, settlement);
  const items = getMatchingSettlementItems(party, settlement);
  const payments = members
    .filter((member) => member.memberId !== party.myMemberId)
    .map((member) => {
      const item = items.find((item) => item.memberId === member.memberId);
      return {
        member,
        item,
        estimatedShareWon: isWon(item?.estimatedShareWon)
          ? item.estimatedShareWon
          : null,
        prepayDueWon: isWon(item?.prepayDueWon) ? item.prepayDueWon : null,
      };
    });
  const ready =
    payments.length > 0 &&
    payments.every(
      ({ item }) =>
        Number.isSafeInteger(item?.prepayDueWon) && item.prepayDueWon >= 0,
    );
  const total = ready
    ? payments.reduce((sum, { prepayDueWon }) => sum + prepayDueWon, 0)
    : null;
  return {
    payments,
    totalWon: isWon(total) ? total : null,
  };
}
