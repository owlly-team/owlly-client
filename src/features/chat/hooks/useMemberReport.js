import { useState } from "react";
import { getReportTargets } from "../utils/reportUtils";

export default function useMemberReport({ party, onSubmitted }) {
  const [targetMemberId, setTargetMemberId] = useState("");
  const [reasonCode, setReasonCode] = useState("");
  const [details, setDetails] = useState("");
  const targets = getReportTargets(party);
  const canSubmit = targets.some((member) => member.memberId === targetMemberId) && Boolean(reasonCode);

  function submit(event) {
    event.preventDefault();
    if (canSubmit) onSubmitted();
  }

  return { targets, targetMemberId, setTargetMemberId, reasonCode, setReasonCode, details, setDetails, canSubmit, submit };
}