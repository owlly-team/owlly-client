import { apiResponse } from "../../../shared/api/client";
import { fetchParty } from "../../matching/api/partyApi";
import useSessionStore from "../../../shared/stores/sessionStore";
import { rideRequestIndex } from "../../matching/stores/rideRequestIndex";

export function createHomeApi(csrfToken, signal) {
  const userId = useSessionStore.getState().user?.id;
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
    rideRequest: async (id) => {
      const response = await get(`/ride-requests/${encodeURIComponent(id)}`);
      if (!signal?.aborted) rideRequestIndex.remember(userId, response.data);
      return response;
    },
    party: (id, options) => fetchParty(id, { signal, ...options }),
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
