import { chatRoomMockData } from "../../chat/mocks/chatRoomMockData.js";

// 시연에서만 상대적인 단계·하차 시각과 새 메시지 수를 만든다.
export function createRideProgressPreview(party) {
  if (
    party?.id !== chatRoomMockData.room.partyId ||
    party.roomId !== chatRoomMockData.room.id
  )
    return null;
  const departure = Date.parse(party.departureAt);
  const at = (minutes) =>
    Number.isFinite(departure)
      ? new Date(departure + minutes * 60000).toISOString()
      : null;
  const members = [...(party.members ?? [])]
    .filter(
      (member) =>
        !["LEFT", "DECLINED", "REMOVED_UNPAID"].includes(member.decision),
    )
    .sort((a, b) => (a.stopOrder ?? Infinity) - (b.stopOrder ?? Infinity));
  return {
    room: {
      ...chatRoomMockData.room,
      id: party.roomId,
      partyId: party.id,
      departureAt: party.departureAt,
      meetingNote: party.pickupPoint?.meetingNote ?? party.pickupPoint?.name,
    },
    unreadCount: 2,
    prepayAt: at(1),
    taxiAt: at(5),
    arrivals: Object.fromEntries(
      members.map((member, index) => [member.memberId, at(22 + index * 8)]),
    ),
  };
}
