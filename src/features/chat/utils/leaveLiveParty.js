import { getLeavePartyState } from "./leavePartyUtils.js";
import {
  getMyDecision,
  validateParty,
} from "../../matching/utils/partyFlow.js";

export async function leaveLiveParty(
  api,
  { party, etag, now, transfers },
  key,
) {
  const state = getLeavePartyState(party, now, transfers);
  if (!state.canLeave) throw new Error(state.reason);
  if (!etag) throw new Error("팟 버전을 확인할 수 없어요. 다시 불러와 주세요.");
  const response = await api.leaveParty(party.id, etag, key);
  const updated = validateParty(response.data, party.id, party.myMemberId);
  if (!["LEFT", "DECLINED"].includes(getMyDecision(updated)))
    throw new Error("나가기 결과를 확인할 수 없어요. 다시 확인해 주세요.");
  return updated;
}
