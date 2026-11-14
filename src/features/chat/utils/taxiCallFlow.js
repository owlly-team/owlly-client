import { validateParty } from "../../matching/utils/partyFlow.js";
export function getTaxiCallState(party, etag) {
  const me = party?.members?.find(
    (member) => member.memberId === party.myMemberId,
  );
  if (
    !party?.myMemberId ||
    party.myMemberId !== party.representativeMemberId ||
    me?.decision !== "ACCEPTED"
  )
    return {
      canConfirm: false,
      reason: "참여를 확정한 대표만 택시 호출을 확인할 수 있어요.",
    };
  if (party.taxiCalledAt)
    return { canConfirm: false, reason: "이미 택시 호출을 기록했어요." };
  if (
    party.status !== "PREPAYING" ||
    !party.allowedActions?.includes("CONFIRM_TAXI_CALL")
  )
    return {
      canConfirm: false,
      reason: "지금은 택시 호출을 확인할 수 없어요.",
    };
  if (!etag)
    return { canConfirm: false, reason: "팟 정보를 다시 확인하고 있어요." };
  return { canConfirm: true, reason: null };
}
export async function confirmTaxiCall(api, context, key) {
  const { party, etag } = context;
  if (
    party?.myMemberId &&
    party.myMemberId === party.representativeMemberId &&
    Number.isFinite(Date.parse(party.taxiCalledAt))
  )
    return context;
  const state = getTaxiCallState(party, etag);
  if (!state.canConfirm) throw new Error(state.reason);
  const response = await api.confirmTaxiCall(party.id, etag, key);
  const updated = validateParty(response.data, party.id, party.myMemberId);
  if (
    updated.myMemberId !== updated.representativeMemberId ||
    !Number.isFinite(Date.parse(updated.taxiCalledAt)) ||
    !["READY", "RIDING", "SETTLING", "COMPLETED"].includes(updated.status)
  )
    throw new Error(
      "택시 호출 확인 결과를 확인할 수 없어요. 다시 확인해 주세요.",
    );
  return { party: updated, etag: response.etag };
}
export function taxiCallErrorMessage(error) {
  if (error.status === 412)
    return "팟 정보가 변경됐어요. 최신 정보를 확인한 뒤 다시 눌러 주세요.";
  if (error.code === "INVALID_STATE")
    return "팟 상태가 바뀌어 지금은 택시 호출을 확인할 수 없어요.";
  if (error.code === "POLICY_NOT_CONFIGURED")
    return "지금은 택시 호출 확인을 처리할 수 없어요. 잠시 후 다시 시도해 주세요.";
  if (error.status === 429) return "요청이 많아요. 잠시 후 다시 시도해 주세요.";
  if ([401, 403, 404, 410].includes(error.status))
    return "대표 권한과 팟 접근 상태를 다시 확인해 주세요.";
  return error.message ?? "택시 호출을 기록하지 못했어요. 다시 시도해 주세요.";
}
