import { apiResponse } from "../../../shared/api/client";
import { normalizeMatchingIds } from "../../matching/utils/registrationFlow";

export function createChatApi(csrfToken, signal) {
  const request = async (path, options) => {
    const response = await apiResponse(path, {
      signal,
      cache: "no-store",
      ...options,
    });
    return { ...response, data: normalizeMatchingIds(response.data) };
  };
  return {
    recipientAccount: (transferId) =>
      request(`/transfers/${encodeURIComponent(transferId)}/recipient-account`),
    report: (roomId, body, key) =>
      request(`/rooms/${encodeURIComponent(roomId)}/reports`, {
        method: "POST",
        body,
        headers: { "X-CSRF-Token": csrfToken, "Idempotency-Key": key },
      }),
    messages: (roomId, query = {}) =>
      request(
        `/rooms/${encodeURIComponent(roomId)}/messages?${new URLSearchParams({ limit: "50", ...query })}`,
      ),
    send: (roomId, body, key) =>
      request(`/rooms/${encodeURIComponent(roomId)}/messages`, {
        method: "POST",
        body,
        headers: { "X-CSRF-Token": csrfToken, "Idempotency-Key": key },
      }),
  };
}
