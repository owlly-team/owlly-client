import { apiResponse } from "../../../shared/api/client";
import useSessionStore from "../../../shared/stores/sessionStore";
import { partyCache } from "../stores/partyCache";
import { normalizeMatchingIds } from "../utils/registrationFlow";
import { validateParty } from "../utils/partyFlow";

function sessionUserId() {
  const { status, user } = useSessionStore.getState();
  if (status !== "authenticated" || user?.id == null)
    throw Object.assign(new Error("로그인 후 팟을 확인해 주세요."), {
      status: 401,
    });
  return String(user.id);
}

function normalizeResponse(response, partyId) {
  const data = normalizeMatchingIds(response.data);
  validateParty(data, String(partyId));
  return { ...response, data };
}

export function fetchParty(partyId, options = {}) {
  return partyCache.load(
    sessionUserId(),
    partyId,
    async (signal) =>
      normalizeResponse(
        await apiResponse(`/parties/${encodeURIComponent(partyId)}`, {
          signal,
        }),
        partyId,
      ),
    options,
  );
}

export async function changeParty(partyId, send) {
  const userId = sessionUserId();
  const token = partyCache.invalidate(userId, partyId);
  try {
    const response = normalizeResponse(await send(), partyId);
    return partyCache.commit(token, response);
  } catch (error) {
    if ([401, 403, 404, 410].includes(error.status))
      partyCache.rejectAccess(token, error);
    throw error;
  }
}
