export function validateParty(party, partyId, myMemberId) {
  if (
    party?.id !== partyId ||
    !party.myMemberId ||
    !Array.isArray(party.members) ||
    !party.members.some((member) => member.memberId === party.myMemberId) ||
    (myMemberId && party.myMemberId !== myMemberId)
  )
    throw new Error("팟과 참여자 정보를 확인할 수 없어요.");
  return party;
}

export async function loadMatchingResult(
  api,
  partyId,
  { includeBanks = true, forceParty = false } = {},
) {
  const { data, etag } = await api.party(partyId, { force: forceParty });
  const party = validateParty(data, partyId);
  const [settlementResult, banksResult] = await Promise.allSettled([
    api.settlement(partyId),
    includeBanks ? api.banks() : Promise.resolve({ data: [] }),
  ]);
  for (const result of [settlementResult, banksResult]) {
    if (
      result.status === "rejected" &&
      [401, 403].includes(result.reason.status)
    )
      throw result.reason;
  }
  const settlement =
    settlementResult.status === "fulfilled" &&
    settlementResult.value.data?.partyId === partyId
      ? settlementResult.value.data
      : null;
  return {
    party,
    partyEtag: etag,
    settlement,
    settlementNotReady:
      settlementResult.status === "rejected" &&
      settlementResult.reason.code === "SETTLEMENT_NOT_READY",
    settlementError:
      !settlement &&
      !(
        settlementResult.status === "rejected" &&
        settlementResult.reason.code === "SETTLEMENT_NOT_READY"
      ),
    banks:
      banksResult.status === "fulfilled" &&
      Array.isArray(banksResult.value.data)
        ? banksResult.value.data
        : [],
  };
}

export function getMyDecision(party) {
  return party?.members?.find((member) => member.memberId === party.myMemberId)
    ?.decision;
}

export async function confirmMembership(api, context, key, now = Date.now()) {
  const { party, partyEtag } = context;
  if (getMyDecision(party) === "ACCEPTED") return context;
  if (
    getMyDecision(party) !== "PENDING" ||
    !party.allowedActions?.includes("CONFIRM") ||
    party.status === "CANCELLED"
  ) {
    throw new Error(
      "지금은 이 팟을 확정할 수 없어요. 최신 정보를 확인해 주세요.",
    );
  }
  if (party.confirmDeadlineAt && now >= Date.parse(party.confirmDeadlineAt))
    throw new Error("팟 확정 마감 시간이 지났어요.");
  if (!partyEtag)
    throw new Error("팟 버전을 확인할 수 없어요. 다시 불러와 주세요.");
  const response = await api.confirmParty(party.id, partyEtag, key);
  validateParty(response.data, party.id, party.myMemberId);
  if (getMyDecision(response.data) !== "ACCEPTED")
    throw new Error("참여 확정 결과를 확인할 수 없어요.");
  return { ...context, party: response.data, partyEtag: response.etag };
}

export async function loadPartyRoom(api, party, expectedRoomId) {
  if (getMyDecision(party) !== "ACCEPTED")
    throw new Error("팟 참여를 먼저 확정해 주세요.");
  const { data: room } = await api.room(party.id);
  if (
    !room?.id ||
    room.partyId !== party.id ||
    (party.roomId && room.id !== party.roomId) ||
    (expectedRoomId && room.id !== expectedRoomId)
  )
    throw new Error("팟과 채팅방 정보가 일치하지 않아요.");
  if (room.status !== "OPEN")
    throw Object.assign(new Error("종료된 채팅방이에요."), {
      code: "ROOM_ACCESS_EXPIRED",
    });
  return room;
}
