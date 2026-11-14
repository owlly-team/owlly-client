import { useEffect, useRef, useState } from "react";
import useSessionStore from "../../../shared/stores/sessionStore";
import { createChatApi } from "../api/chatApi";
import {
  createReportBody,
  getReportTargets,
  REPORT_REASON_CODES,
  reportErrorMessage,
  submitReport,
} from "../utils/reportFlow";
import { isRoomAccessError } from "../utils/messageFlow";
export { getReportTargets } from "../utils/reportFlow";

export default function useMemberReport({
  party,
  room,
  onSubmitted,
  isPreview = false,
  message,
}) {
  const { user, csrfToken } = useSessionStore();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [duplicates, setDuplicates] = useState([]);
  const [retryAt, setRetryAt] = useState(0);
  const operation = useRef(null);
  const command = useRef(null);
  useEffect(
    () => () => operation.current?.abort(),
    [user?.id, room?.id, party?.myMemberId],
  );
  useEffect(() => {
    if (!retryAt) return;
    const timer = setTimeout(
      () => setRetryAt(0),
      Math.max(0, retryAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [retryAt]);
  const [targetMemberId, setTargetMemberId] = useState(
    message?.senderMemberId ?? "",
  );
  const [reasonCode, setReasonCode] = useState("");
  const [details, setDetails] = useState("");
  const targets = getReportTargets(party);
  const canSubmit =
    !saving &&
    !blocked &&
    !retryAt &&
    !duplicates.includes(targetMemberId) &&
    targets.some((member) => member.memberId === targetMemberId) &&
    REPORT_REASON_CODES.includes(reasonCode) &&
    details.length <= 200 &&
    room?.status === "OPEN" &&
    (isPreview ||
      party.members.some(
        (member) =>
          member.memberId === party.myMemberId &&
          member.decision === "ACCEPTED",
      ));

  async function submit(event) {
    event.preventDefault();
    if (!canSubmit || operation.current) return;
    setError("");
    if (isPreview) {
      onSubmitted();
      return;
    }
    const controller = new AbortController();
    operation.current = controller;
    setSaving(true);
    const active = () =>
      !controller.signal.aborted &&
      useSessionStore.getState().user?.id === user?.id;
    try {
      const body = createReportBody({
        party,
        room,
        targetMemberId,
        reasonCode,
        details,
        message,
      });
      const fingerprint = JSON.stringify([user?.id, room.id, body]);
      if (command.current?.fingerprint !== fingerprint)
        command.current = { fingerprint, body, key: crypto.randomUUID() };
      const report = await submitReport(
        createChatApi(csrfToken, controller.signal),
        room.id,
        command.current.body,
        command.current.key,
      );
      if (!active()) return;
      command.current = null;
      setDetails("");
      onSubmitted(report);
    } catch (failure) {
      if (!active()) return;
      setError(reportErrorMessage(failure));
      if (failure.code === "REPORT_ALREADY_EXISTS")
        setDuplicates((previous) => [...previous, targetMemberId]);
      if (isRoomAccessError(failure)) setBlocked(true);
      if (failure.status === 429)
        setRetryAt(
          Date.now() +
            Math.max(1000, (Number(failure.retryAfter) || 30) * 1000),
        );
    } finally {
      if (operation.current === controller) operation.current = null;
      if (active()) setSaving(false);
    }
  }

  return {
    targets,
    targetMemberId,
    setTargetMemberId,
    reasonCode,
    setReasonCode,
    details,
    setDetails,
    canSubmit,
    submit,
    saving,
    error,
  };
}
