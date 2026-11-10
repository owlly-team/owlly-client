export function toMatchingResultView(party, settlement) {
  const members = party.members
    .filter((member) => !["DECLINED", "LEFT", "REMOVED_UNPAID"].includes(member.decision))
    .toSorted((a, b) => (a.stopOrder ?? Infinity) - (b.stopOrder ?? Infinity));
  return {
    members,
    companionCount: members.filter((member) => member.memberId !== party.myMemberId).length,
    allSameSchool: Boolean(party.pickupPoint?.universityName)
      && members.every((member) => member.universityName === party.pickupPoint.universityName),
    mySettlementItem: settlement?.partyId === party.id
      ? settlement.items.find((item) => item.memberId === party.myMemberId)
      : undefined,
  };
}
