import { apiResponse } from "../../../shared/api/client";
import { normalizeMatchingIds } from "../../matching/utils/registrationFlow";

export function createSettlementApi(csrfToken, signal) {
  const request = async (
    partyId,
    action,
    body,
    headers = {},
    method = "POST",
  ) => {
    const response = await apiResponse(
      `/parties/${encodeURIComponent(partyId)}/settlement/${action}`,
      {
        method,
        body,
        signal,
        cache: "no-store",
        headers: { "X-CSRF-Token": csrfToken, ...headers },
      },
    );
    return { ...response, data: normalizeMatchingIds(response.data) };
  };
  return {
    updateRoute: (partyId, body, etag, key) =>
      request(
        partyId,
        "route",
        body,
        {
          "If-Match": etag,
          "Idempotency-Key": key,
        },
        "PATCH",
      ),
    preview: (partyId, body) => request(partyId, "preview", body),
    finalize: (partyId, body, etag, key) =>
      request(partyId, "finalize", body, {
        "If-Match": etag,
        "Idempotency-Key": key,
      }),
  };
}
