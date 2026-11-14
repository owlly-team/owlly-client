export function getSettlementRefreshKey(party, phase = "") {
  if (!party) return "";
  const mine = party.members?.find(
    (member) => member.memberId === party.myMemberId,
  );
  return JSON.stringify([
    party.id,
    party.status,
    party.routeVersion,
    party.representativeMemberId,
    party.departureAt,
    party.taxiCalledAt,
    mine?.memberId,
    mine?.decision,
    mine?.boardingStatus,
    phase,
  ]);
}
