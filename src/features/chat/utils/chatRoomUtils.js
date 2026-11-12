// 나가기 조건은 같은 utils 폴더의 API-24 목업 규칙을 사용
import { getLeavePartyState } from "./leavePartyUtils.js";
import { chatRoomMockData, getMockChatRoom } from "../mocks/chatRoomMockData.js";

export function resolveChatRoom({ roomId, partyId, state, demo, previewMember = false }) {
  const legacyPreview = partyId && !state?.matchingResult && state?.isPreview !== false
    ? getMockChatRoom(partyId, state?.chatContext) : null;
  const result = state?.matchingResult ?? legacyPreview?.context ?? state?.chatContext ?? demo;
  const isPreview = state?.isPreview ?? Boolean(demo || legacyPreview);
  const party = result?.party;
  const sourceRoom = state?.room ?? result?.room ?? legacyPreview?.room ?? (party?.roomId ? {
    id: party.roomId, partyId: party.id, status: "OPEN", canSendMessage: isPreview,
    departureAt: party.departureAt, meetingNote: party.pickupPoint?.meetingNote ?? party.pickupPoint?.name,
  } : null);
  // 매칭 결과에서 진입한 미리보기도 같은 방의 확인 코드를 유지한다.
  const room = isPreview && sourceRoom?.id === chatRoomMockData.room.id
    && sourceRoom.partyId === chatRoomMockData.room.partyId && !("verificationCode" in sourceRoom)
    ? { ...sourceRoom, verificationCode: chatRoomMockData.room.verificationCode } : sourceRoom;
  const currentParty = party && { ...party, roomId: party.roomId ?? room?.id,
    ...(demo && !state?.matchingResult && previewMember ? { myMemberId: "502" } : {}),
  };
  if (!currentParty || !room || room.partyId !== currentParty.id || room.id !== currentParty.roomId
    || (roomId && currentParty.roomId !== roomId) || (partyId && currentParty.id !== partyId)) return null;
  // 모든 미리보기 경로는 목업의 현재 시각을 사용한다. 이전 방문에 저장된 시각은 사용하지 않는다.
  const previewNow = isPreview ? Date.parse(chatRoomMockData.previewNow) : undefined;
  const context = { ...result, party: currentParty,
    ...(demo && !state?.matchingResult && previewMember && result.settlement ? {
      settlement: { ...result.settlement, items: result.settlement.items.map((item) => ({ ...item, isMe: item.memberId === currentParty.myMemberId })) },
    } : {}),
  };
  return { context: isPreview ? getMockChatRoom(currentParty.id, context, previewNow).context : context,
    room, isPreview, previewNow };
}

export function getChatRoomView(room, context, now = Date.now()) {
  const party = context?.party?.id === room.partyId ? context.party : null;
  const members = party?.members?.filter((member) =>
    !["DECLINED", "LEFT", "REMOVED_UNPAID"].includes(member.decision)) ?? [];
  const representative = members.find((member) => member.memberId === party.representativeMemberId);
  const destination = party?.districtName ?? (context?.rideRequest?.partyId === room.partyId
    ? context.rideRequest.districtName : null);
  const pickupName = party?.pickupPoint?.name;
  const departure = Date.parse(room.departureAt);
  const minutes = Number.isFinite(departure) ? Math.max(0, Math.ceil((departure - now) / 60000)) : null;
  const closed = room.status === "CLOSED";
  const transfers = context?.settlement?.partyId === room.partyId
    ? context.settlement.items.flatMap((item) => item.transfers) : [];
  const leaveState = getLeavePartyState(party, now, transfers);
  return {
    // 필요한 정보가 없으면 임의로 채우지 않고 기본 제목이나 안내 문구를 표시
    title: pickupName ? `${pickupName}${destination ? ` → ${destination}` : ""}${members.length ? ` · ${members.length}명` : ""}` : "팟 채팅방",
    members,
    memberCount: members.length || null,
    representativeName: representative?.maskedName,
    timingLabel: closed ? "종료된 채팅방" : minutes == null ? "집결 시각 확인 중" : minutes > 0 ? `집결까지 ${minutes}분` : "집결 시간이 됐어요",
    // 종료되지 않은 방에서 전달받은 코드가 정확히 네 자리 숫자일 때만 노출
    verificationCode: !closed && /^\d{4}$/.test(room.verificationCode ?? "") ? room.verificationCode : null,
    closed,
    // API-24의 팟 상태·허용 동작·마감 시각을 기준으로 나가기 가능 여부를 판단한다.
    canLeave: !closed && leaveState.canLeave,
    leaveDisabledReason: closed ? "종료된 채팅방에서는 나갈 수 없어요." : leaveState.reason,
    // 방이 열려 있고 전송 가능 상태일 때만 메시지 입력을 허용
    canCompose: !closed && room.canSendMessage === true,
  };
}
