export function toMatchingResultView(party, settlement) {
  const members = party.members
    .filter((member) => !["DECLINED", "LEFT", "REMOVED_UNPAID"].includes(member.decision))
    .toSorted((a, b) => (a.stopOrder ?? Infinity) - (b.stopOrder ?? Infinity));
  return {
    isRepresentative: Boolean(party.myMemberId)
      && party.myMemberId === party.representativeMemberId,
    members,
    companionCount: members.filter((member) => member.memberId !== party.myMemberId).length,
    allSameSchool: Boolean(party.pickupPoint?.universityName)
      && members.every((member) => member.universityName === party.pickupPoint.universityName),
    mySettlementItem: settlement?.partyId === party.id
      ? settlement.items.find((item) => item.memberId === party.myMemberId)
      : undefined,
  };
}

export function toRepresentativePayments(party, settlement) {
  const { members } = toMatchingResultView(party, settlement);
  const items = settlement?.partyId === party.id ? settlement.items : [];
  const payments = members.filter((member) => member.memberId !== party.myMemberId)
    .map((member) => ({
      member,
      item: items.find((item) => item.memberId === member.memberId),
    }));
  const ready = payments.length > 0 && payments.every(({ item }) =>
    Number.isSafeInteger(item?.prepayDueWon) && item.prepayDueWon >= 0);
  return {
    payments,
    totalWon: ready ? payments.reduce((sum, { item }) => sum + item.prepayDueWon, 0) : null,
  };
}
