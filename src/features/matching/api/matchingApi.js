import { apiResponse } from "../../../shared/api/client";
import { normalizeMatchingIds } from "../utils/registrationFlow";
import { fetchParty, changeParty } from "./partyApi";
import useSessionStore from "../../../shared/stores/sessionStore";
import { rideRequestIndex } from "../stores/rideRequestIndex";

export function createMatchingApi(csrfToken, signal) {
  const userId = useSessionStore.getState().user?.id;
  const trackRequest = async (promise, replace = false) => {
    const response = await promise;
    if (!signal?.aborted)
      rideRequestIndex.remember(userId, response.data, replace);
    return response;
  };
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
      trackRequest(
        post(
          `/journeys/${encodeURIComponent(journeyId)}/ride-requests`,
          body,
          key,
        ),
        true,
      ),
    rideRequest: (id) =>
      trackRequest(request(`/ride-requests/${encodeURIComponent(id)}`)),
    cancelRideRequest: (id, key) =>
      trackRequest(
        post(`/ride-requests/${encodeURIComponent(id)}/cancel`, undefined, key),
      ),
    chooseJourney: (journeyId, mode, key) =>
      request(`/journeys/${encodeURIComponent(journeyId)}/choice`, {
        method: "PUT",
        body: { mode },
        headers: { "X-CSRF-Token": csrfToken, "Idempotency-Key": key },
      }),
    party: (id, options) => fetchParty(id, { signal, ...options }),
    settlement: (id) =>
      request(`/parties/${encodeURIComponent(id)}/settlement`),
    banks: () => request("/banks"),
    room: (id) => request(`/parties/${encodeURIComponent(id)}/room`),
    confirmParty: (id, etag, key) =>
      changeParty(id, () =>
        post(`/parties/${encodeURIComponent(id)}/confirm`, undefined, key, {
          "If-Match": etag,
        }),
      ),
    leaveParty: (id, etag, key) =>
      changeParty(id, () =>
        post(`/parties/${encodeURIComponent(id)}/leave`, undefined, key, {
          "If-Match": etag,
        }),
      ),
    registerAccount: (roomId, purpose, body, key) =>
      request(`/rooms/${encodeURIComponent(roomId)}/accounts/${purpose}`, {
        method: "PUT",
        body,
        headers: { "X-CSRF-Token": csrfToken, "Idempotency-Key": key },
      }),
  };
}
