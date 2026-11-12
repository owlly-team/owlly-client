import { useState } from "react";
import { mockRepresentativeMatchingResult } from "../mocks/matchingMockData";

export default function useMatchingResult(partyId, preview) {
  const source = preview ?? mockRepresentativeMatchingResult;
  const [updated, setUpdated] = useState(null);
  const data = updated?.source === source ? { ...source, party: updated.party } : source;
  const valid = data.party?.id === partyId;

  return {
    data: valid ? data : null,
    loading: false,
    error: valid ? null : new Error("팟 정보가 없어요."),
    isPreview: true,
    updateParty: ({ party }) => setUpdated({ source, party }),
    retry: () => setUpdated(null),
  };
}
