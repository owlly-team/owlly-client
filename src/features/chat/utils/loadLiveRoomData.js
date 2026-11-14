import {
  loadPartyRoom,
  loadPartySettlement,
  validateParty,
} from "../../matching/utils/partyFlow.js";

export async function loadLiveRoomData(
  api,
  partyId,
  roomId,
  { onUpdate, signal } = {},
) {
  const response = await api.party(partyId);
  const party = validateParty(response.data, partyId);
  let context = {
    party,
    partyEtag: response.etag,
    settlement: null,
    settlementLoading: true,
    banks: [],
  };
  let room,
    active = true;
  const snapshot = () => ({
    context: { ...context, party: { ...party, roomId: room.id } },
    room,
    isPreview: false,
  });
  const publish = () => {
    if (active && room && !signal?.aborted) onUpdate?.(snapshot());
  };
  try {
    // API-27 권한 검증과 API-33 정산 조회는 독립적이다. 방 검증 전에는 대화를 노출하지 않는다.
    await Promise.all([
      loadPartyRoom(api, party, roomId).then((value) => {
        room = value;
        publish();
      }),
      loadPartySettlement(api, partyId).then((fields) => {
        context = { ...context, ...fields };
        publish();
      }),
    ]);
    if (signal?.aborted)
      throw new DOMException("조회가 취소됐어요.", "AbortError");
    return snapshot();
  } finally {
    active = false;
  }
}
