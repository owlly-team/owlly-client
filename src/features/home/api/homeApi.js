import { apiResponse } from "../../../shared/api/client";

export function createHomeApi(csrfToken, signal) {
  const get = (path) => apiResponse(path, { signal });
  return {
    profile: () => get("/me/profile"),
    pickupPoints: (universityId) =>
      get(
        universityId
          ? `/pickup-points?${new URLSearchParams({ universityId })}`
          : "/pickup-points",
      ),
    journeys: (cursor) =>
      get(
        `/me/journeys?${new URLSearchParams({ limit: "100", ...(cursor ? { cursor } : {}) })}`,
      ),
    rideRequest: (id) => get(`/ride-requests/${encodeURIComponent(id)}`),
    party: (id) => get(`/parties/${encodeURIComponent(id)}`),
    settlement: (id) => get(`/parties/${encodeURIComponent(id)}/settlement`),
    travelOptions: (body) =>
      apiResponse("/travel-options", {
        method: "POST",
        body,
        signal,
        headers: { "X-CSRF-Token": csrfToken },
      }),
    slots: (query) => get(`/matching-slots?${new URLSearchParams(query)}`),
  };
}
