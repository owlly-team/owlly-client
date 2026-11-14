import { validateParty } from "../../matching/utils/partyFlow.js";

const RECORDED = ["BOARDED", "MISSED"];
export function getBoardingState(party, now) {
  const member = party?.members?.find(
    (item) => item.memberId === party.myMemberId,
  );
  if (RECORDED.includes(member?.boardingStatus))
    return { canRecord: false, reason: "이미 탑승 응답을 기록했어요." };
  if (
    member?.decision !== "ACCEPTED" ||
    member.boardingStatus !== "UNKNOWN" ||
    !["PREPAYING", "READY", "RIDING"].includes(party?.status)
  )
    return {
      canRecord: false,
      reason: "현재 참여 상태에서는 탑승을 확인할 수 없어요.",
    };
  const departure = Date.parse(party.departureAt);
  if (!Number.isFinite(departure) || !Number.isFinite(now))
    return { canRecord: false, reason: "탑승 확인 시각을 확인할 수 없어요." };
  if (now < departure - 15 * 60000 || now > departure + 60 * 60000)
    return {
      canRecord: false,
      reason: "탑승 확인은 출발 15분 전부터 출발 1시간 후까지 가능해요.",
    };
  if (!party.allowedActions?.includes("RECORD_BOARDING"))
    return { canRecord: false, reason: "지금은 탑승을 확인할 수 없어요." };
  return { canRecord: true, reason: null };
}
export async function recordBoarding(
  api,
  context,
  status,
  key,
  now = Date.now(),
) {
  if (!RECORDED.includes(status)) throw new Error("탑승 응답을 확인해 주세요.");
  const { party } = context;
  const current = party.members?.find(
    (member) => member.memberId === party.myMemberId,
  )?.boardingStatus;
  if (current === status) return context;
  if (RECORDED.includes(current))
    throw Object.assign(
      new Error("이미 기록한 탑승 응답은 변경할 수 없어요."),
      { code: "BOARDING_ALREADY_RECORDED" },
    );
  const state = getBoardingState(party, now);
  if (!state.canRecord) throw new Error(state.reason);
  const response = await api.confirmBoarding(party.id, status, key);
  const updated = validateParty(response.data, party.id, party.myMemberId);
  if (
    updated.members.find((member) => member.memberId === party.myMemberId)
      ?.boardingStatus !== status ||
    (status === "BOARDED" && updated.status !== "RIDING")
  )
    throw new Error("탑승 기록 결과를 확인할 수 없어요. 다시 확인해 주세요.");
  return { party: updated, etag: response.etag };
}
export function boardingErrorMessage(error) {
  if (error.code === "BOARDING_NOT_ALLOWED")
    return "지금은 탑승을 확인할 수 없어요. 참여 상태와 시간을 다시 확인해 주세요.";
  if (error.code === "BOARDING_ALREADY_RECORDED")
    return "이미 기록한 탑승 응답은 변경할 수 없어요.";
  if (error.code === "POLICY_NOT_CONFIGURED")
    return "지금은 탑승 기록을 처리할 수 없어요. 잠시 후 다시 시도해 주세요.";
  if (error.status === 429) return "요청이 많아요. 잠시 후 다시 시도해 주세요.";
  if ([401, 403, 404, 410].includes(error.status))
    return "팟 접근 권한을 다시 확인해 주세요.";
  return error.message ?? "탑승 응답을 기록하지 못했어요. 다시 시도해 주세요.";
}
