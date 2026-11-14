import { useEffect } from "react";
import { useMockJourneyStore } from "../stores/mockJourneyStore";
import { scheduleMockMatching } from "../mocks/mockJourneyFlow";

export default function useMockMatchingTransition(rideRequest, enabled) {
  const id = rideRequest?.id;
  const status = rideRequest?.status;
  useEffect(() => {
    return scheduleMockMatching({
      id,
      status,
      enabled,
      store: useMockJourneyStore,
    });
  }, [enabled, id, status]);
}
