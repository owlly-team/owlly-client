import { useState } from "react";
import { leaveMockParty } from "../utils/leavePartyUtils";

export default function useLeaveParty({ party, now, transfers, onLeft }) {
  const [error, setError] = useState("");

  function leave() {
    setError("");
    try {
      const updatedParty = leaveMockParty(party, { now, transfers });
      onLeft(updatedParty);
      return true;
    } catch (failure) {
      setError(failure.message);
      return false;
    }
  }

  return { leave, error };
}