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

export async function loadPartySettlement(api, partyId) {
  try {
    const response = await api.settlement(partyId);
    if (response.data?.partyId !== partyId)
      throw new Error("정산 정보가 일치하지 않아요.");
    return {
      settlement: response.data,
      settlementEtag: response.etag,
      settlementLoading: false,
      settlementNotReady: false,
      settlementError: false,
    };
  } catch (error) {
    if ([401, 403].includes(error.status) || error.name === "AbortError")
      throw error;
    return {
      settlement: null,
      settlementEtag: undefined,
      settlementLoading: false,
      settlementNotReady: error.code === "SETTLEMENT_NOT_READY",
      settlementError: error.code !== "SETTLEMENT_NOT_READY",
    };
  }
}

const reflect = (promise) =>
  promise.then(
    (value) => ({ value }),
    (error) => ({ error }),
  );

export async function loadMatchingResult(
  api,
  partyId,
  { includeBanks = true, forceParty = false, onUpdate } = {},
) {
  const partyPromise = api.party(partyId, { force: forceParty });
  const settlementPromise = reflect(loadPartySettlement(api, partyId));
  const banksPromise = reflect(
    includeBanks
      ? Promise.resolve().then(() => api.banks())
      : Promise.resolve({ data: [] }),
  );
  const { data, etag } = await partyPromise;
  const party = validateParty(data, partyId);
  let partial = {
    party,
    partyEtag: etag,
    settlement: null,
    banks: [],
    settlementLoading: true,
    banksLoading: includeBanks,
    settlementNotReady: false,
    settlementError: false,
  };
  onUpdate?.(partial);
  let active = true;
  const publish = (fields) => {
    if (!active) return;
    partial = { ...partial, ...fields };
    onUpdate?.(partial);
  };
  try {
    await Promise.all([
      settlementPromise.then(({ value, error }) => {
        if (error) throw error;
        publish(value);
      }),
      banksPromise.then(({ value, error }) => {
        if ([401, 403].includes(error?.status) || error?.name === "AbortError")
          throw error;
        publish({
          banks: Array.isArray(value?.data) ? value.data : [],
          banksLoading: false,
        });
      }),
    ]);
    return partial;
  } finally {
    active = false;
  }
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
