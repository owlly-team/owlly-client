const ACTIVE_DECISIONS = ["PENDING", "ACCEPTED"];

// API-24: 허용 동작과 출발 15분 전까지(<=)라는 마감 조건을 함께 확인
export function getLeavePartyState(party, now, transfers = []) {
  const member = party?.members?.find((item) => item.memberId === party.myMemberId);
  const departure = Date.parse(party?.departureAt);
  if (!member || !ACTIVE_DECISIONS.includes(member.decision) || party.status === "CANCELLED") {
    return { canLeave: false, reason: "현재 참여 중인 팟에서만 나갈 수 있어요." };
  }
  if (!Number.isFinite(departure)) return { canLeave: false, reason: "출발 시각을 확인할 수 없어 나갈 수 없어요." };
  if (now > departure - 15 * 60000) {
    return { canLeave: false, code: "CANCELLATION_DEADLINE_PASSED", reason: "출발 15분 전이 지나서 지금은 나갈 수 없어요. 못 가게 되면 채팅으로 알려 주세요." };
  }
  if (transfers.some((transfer) => ["SENT", "RECEIVED"].includes(transfer.status)
    && [transfer.payerMemberId, transfer.payeeMemberId].includes(party.myMemberId))) {
    return { canLeave: false, code: "FUNDS_ALREADY_IN_FLIGHT", reason: "주고받은 송금이 있어 자동으로 나갈 수 없어요. 채팅으로 멤버들에게 알려 주세요." };
  }
  if (!party.allowedActions?.includes("LEAVE")) return { canLeave: false, reason: "지금은 이 팟에서 나갈 수 없어요." };
  return { canLeave: true, reason: "" };
}

export function leaveMockParty(party, { now, transfers = [] }) {
  const member = party?.members?.find((item) => item.memberId === party.myMemberId);
  if (member && ["DECLINED", "LEFT"].includes(member.decision)) return party;
  const state = getLeavePartyState(party, now, transfers);
  if (!state.canLeave) throw Object.assign(new Error(state.reason), { code: state.code });

  const remaining = party.members.filter((item) => item.memberId !== party.myMemberId && ACTIVE_DECISIONS.includes(item.decision));
  const cancelled = party.myMemberId === party.representativeMemberId || remaining.length < 2;
  const order = new Map(remaining.filter((item) => item.stopOrder != null)
    .toSorted((a, b) => a.stopOrder - b.stopOrder).map((item, index) => [item.memberId, index + 1]));
  return {
    ...party,
    status: cancelled ? "CANCELLED" : party.status,
    routeVersion: cancelled ? party.routeVersion : party.routeVersion + 1,
    allowedActions: [],
    members: party.members.map((item) => item.memberId === party.myMemberId
      ? { ...item, decision: member.decision === "PENDING" ? "DECLINED" : "LEFT", stopOrder: null }
      : !cancelled && order.has(item.memberId) ? { ...item, stopOrder: order.get(item.memberId) } : item),
  };
}