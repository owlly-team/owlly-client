const validId = (value) =>
  typeof value === "string" &&
  /^[1-9][0-9]*$/.test(value) &&
  BigInt(value) <= 9223372036854775807n;
export const REPORT_REASON_CODES = [
  "ABUSIVE_LANGUAGE",
  "PRIVACY_REQUEST",
  "NO_SHOW",
  "IDENTITY_MISMATCH",
  "OTHER",
];
export function getReportTargets(party) {
  if (!party?.myMemberId) return [];
  // 이미 이탈한 같은 팟 멤버도 신고할 수 있다.
  return (
    party.members?.filter((member) => member.memberId !== party.myMemberId) ??
    []
  );
}
export function createReportBody({
  party,
  room,
  targetMemberId,
  reasonCode,
  details = "",
  message,
}) {
  if (
    room?.partyId !== party?.id ||
    room?.status !== "OPEN" ||
    !validId(room.id) ||
    !validId(targetMemberId) ||
    !getReportTargets(party).some(
      (member) => member.memberId === targetMemberId,
    ) ||
    !REPORT_REASON_CODES.includes(reasonCode) ||
    typeof details !== "string" ||
    details.length > 200
  )
    throw new Error("신고 대상과 사유를 다시 확인해 주세요.");
  const body = { targetMemberId, reasonCode };
  if (details) body.details = details;
  if (message) {
    if (
      !validId(message.id) ||
      message.roomId !== room.id ||
      message.senderMemberId !== targetMemberId ||
      message.messageType !== "USER"
    )
      throw new Error("신고 대상의 메시지를 확인할 수 없어요.");
    body.messageId = message.id;
  }
  return body;
}
export async function submitReport(api, roomId, body, key) {
  const { data } = await api.report(roomId, body, key);
  if (
    !validId(data?.id) ||
    data.status !== "RECEIVED" ||
    data.rematchingBlocked !== true ||
    !Number.isFinite(Date.parse(data.evidenceDeleteAfter))
  )
    throw new Error(
      "신고 접수 결과를 확인할 수 없어요. 같은 내용으로 다시 시도해 주세요.",
    );
  return data;
}
export function reportErrorMessage(error) {
  const messages = {
    REPORT_ALREADY_EXISTS: "이미 신고한 멤버예요.",
    INVALID_REPORT_TARGET: "신고 대상이나 메시지를 다시 확인해 주세요.",
    ROOM_CLOSED: "종료된 채팅방에서는 신고할 수 없어요.",
    ROOM_NOT_READY: "아직 신고할 수 있는 채팅방이 아니에요.",
    IDEMPOTENCY_CONFLICT:
      "신고 요청 정보가 달라졌어요. 입력 내용을 확인해 주세요.",
    POLICY_NOT_CONFIGURED:
      "지금은 신고를 접수할 수 없어요. 잠시 후 다시 시도해 주세요.",
  };
  if (error.status === 401) return "로그인이 만료됐어요. 다시 로그인해 주세요.";
  if ([403, 404, 410].includes(error.status))
    return "이 채팅방에서 신고할 권한이 없거나 접근이 종료됐어요.";
  if (error.status === 429) return "요청이 많아요. 잠시 후 다시 시도해 주세요.";
  return (
    messages[error.code] ??
    "신고를 접수하지 못했어요. 잠시 후 같은 내용으로 다시 시도해 주세요."
  );
}
