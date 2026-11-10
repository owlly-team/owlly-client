import { getLeavePartyState } from "../utils/leavePartyUtils.js";

export const chatRoomMockData = {
  //27
  room: {
    id: "601", partyId: "401", status: "OPEN",
    meetingNote: "단국대 정문", departureAt: "2026-11-05T23:30:00+09:00",
    verificationCode: "4821", closedAt: null, deleteAfter: null, canSendMessage: true,
  },
  previewNow: "2026-11-05T23:20:00+09:00",
  context: {
    party: {
      id: "401", pickupPoint: { name: "정문" }, representativeMemberId: "503", myMemberId: "502",
      status: "PREPAYING", departureAt: "2026-11-05T23:30:00+09:00", routeVersion: 1, allowedActions: ["LEAVE"],
      members: [
        { memberId: "501", maskedName: "김*연", universityName: "단국대", destinationDongName: "영통1동", decision: "ACCEPTED" },
        { memberId: "502", maskedName: "나", universityName: "단국대", destinationDongName: "영통2동", decision: "ACCEPTED" },
        { memberId: "503", maskedName: "이*준", universityName: "단국대", destinationDongName: "매탄동", decision: "ACCEPTED", isRepresentative: true },
      ],
    },
    rideRequest: { partyId: "401", districtName: "영통구" },
  },
  messages: [
    { id: "1", roomId: "601", senderMemberId: null, messageType: "SYSTEM", body: "매칭이 확정됐어요 · 3명", createdAt: "2026-11-05T23:19:00+09:00" },
    { id: "2", roomId: "601", senderMemberId: null, messageType: "SYSTEM", body: "전화번호 · 집 주소는 주고받지 마세요. 번호 · 링크 · 계좌번호는 자동으로 가려져요.", createdAt: "2026-11-05T23:19:01+09:00" },
    { id: "3", roomId: "601", senderMemberId: "503", messageType: "USER", body: "저 도서관에서 나가는 중이에요", createdAt: "2026-11-05T23:19:10+09:00" },
    { id: "4", roomId: "601", senderMemberId: "501", messageType: "USER", body: "혹시 몰라서 번호 남겨요", createdAt: "2026-11-05T23:19:20+09:00" },
    { id: "5", roomId: "601", senderMemberId: "502", messageType: "USER", body: "정문 오른쪽 편의점 앞이에요", createdAt: "2026-11-05T23:19:30+09:00" },
    { id: "6", roomId: "601", senderMemberId: null, messageType: "SYSTEM", body: "집결 10분 전이에요 · 대표 이*준님이 택시를 불러요", createdAt: "2026-11-05T23:20:00+09:00" },
    { id: "7", roomId: "601", senderMemberId: "502", messageType: "USER", body: "정문 오른쪽 편의점 앞이에요", createdAt: "2026-11-05T23:21:30+09:00" },
  ],
};

export function getMockChatRoom(partyId, context, now = Date.parse(chatRoomMockData.previewNow)) {
  const room = chatRoomMockData.room.partyId === partyId ? chatRoomMockData.room : null;
  const source = context?.party?.id === partyId ? context : chatRoomMockData.context;
  // 목업에서는 이전 화면의 고정 allowedActions 대신 설정된 시각으로 LEAVE를 계산한다.
  // 본인 ID·대표·멤버 정보는 이전 화면에서 전달받은 값을 유지한다.
  const party = { ...source.party, allowedActions: [...new Set([...(source.party.allowedActions ?? []), "LEAVE"])] };
  const transfers = source.settlement?.partyId === partyId
    ? source.settlement.items.flatMap((item) => item.transfers ?? []) : [];
  if (!getLeavePartyState(party, now, transfers).canLeave) {
    party.allowedActions = party.allowedActions.filter((action) => action !== "LEAVE");
  }
  return {
    room,
    context: { ...source, party },
    now,
  };
}
