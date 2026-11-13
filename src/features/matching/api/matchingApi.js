import { apiResponse } from "../../../shared/api/client";
import { normalizeMatchingIds } from "../utils/registrationFlow";

export function createMatchingApi(csrfToken, signal) {
  const request = async (path, options) => {
    const response = await apiResponse(path, { signal, ...options });
    return { ...response, data: normalizeMatchingIds(response.data) };
  };
  const post = (path, body, key, headers) =>
    request(path, {
      method: "POST",
      body,
      headers: {
        "X-CSRF-Token": csrfToken,
        "Idempotency-Key": key,
        ...headers,
      },
    });
  return {
    profile: () => request("/me/profile"),
    journeys: (cursor) =>
      request(
        `/me/journeys?${new URLSearchParams({ limit: "100", ...(cursor ? { cursor } : {}) })}`,
      ),
    pickupPoints: (universityId) =>
      request(
        universityId
          ? `/pickup-points?${new URLSearchParams({ universityId })}`
          : "/pickup-points",
      ),
    travelOptions: (body) =>
      request("/travel-options", {
        method: "POST",
        body,
        headers: { "X-CSRF-Token": csrfToken },
      }),
    slots: (query) => request(`/matching-slots?${new URLSearchParams(query)}`),
    createJourney: (body, key) => post("/journeys", body, key),
    createRideRequest: (journeyId, body, key) =>
      post(
        `/journeys/${encodeURIComponent(journeyId)}/ride-requests`,
        body,
        key,
      ),
    rideRequest: (id) => request(`/ride-requests/${encodeURIComponent(id)}`),
    cancelRideRequest: (id, key) =>
      post(`/ride-requests/${encodeURIComponent(id)}/cancel`, undefined, key),
    party: (id) => request(`/parties/${encodeURIComponent(id)}`),
    settlement: (id) =>
      request(`/parties/${encodeURIComponent(id)}/settlement`),
    banks: () => request("/banks"),
    room: (id) => request(`/parties/${encodeURIComponent(id)}/room`),
    confirmParty: (id, etag, key) =>
      post(`/parties/${encodeURIComponent(id)}/confirm`, undefined, key, {
        "If-Match": etag,
      }),
    leaveParty: (id, etag, key) =>
      post(`/parties/${encodeURIComponent(id)}/leave`, undefined, key, {
        "If-Match": etag,
      }),
    registerAccount: (roomId, purpose, body, key) =>
      request(`/rooms/${encodeURIComponent(roomId)}/accounts/${purpose}`, {
        method: "PUT",
        body,
        headers: { "X-CSRF-Token": csrfToken, "Idempotency-Key": key },
      }),
  };
}
