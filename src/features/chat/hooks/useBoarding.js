import { useEffect, useRef, useState } from "react";
import useSessionStore from "../../../shared/stores/sessionStore";
import { createMatchingApi } from "../../matching/api/matchingApi";
import {
  boardingErrorMessage,
  getBoardingState,
  recordBoarding,
} from "../utils/boardingFlow";

export default function useBoarding({
  party,
  onRecorded,
  isPreview = true,
  now,
  etag,
}) {
  const { user, csrfToken } = useSessionStore();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [retryAt, setRetryAt] = useState(0);
  const operation = useRef(null);
  const keys = useRef({});
  const scope = `${user?.id}:${party.id}:${party.myMemberId}`;
  useEffect(() => () => operation.current?.abort(), [scope, isPreview]);
  useEffect(() => {
    if (!retryAt) return;
    const timer = setTimeout(
      () => setRetryAt(0),
      Math.max(0, retryAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [retryAt]);
  const status =
    party.members?.find((member) => member.memberId === party.myMemberId)
      ?.boardingStatus ?? "UNKNOWN";
  const recorded = ["BOARDED", "MISSED"].includes(status);

  async function record(nextStatus) {
    if (
      operation.current ||
      retryAt ||
      recorded ||
      !["BOARDED", "MISSED"].includes(nextStatus)
    )
      return;
    if (!isPreview) {
      const controller = new AbortController();
      operation.current = controller;
      const api = createMatchingApi(csrfToken, controller.signal);
      const active = () =>
        !controller.signal.aborted &&
        useSessionStore.getState().user?.id === user?.id;
      const key = (keys.current[`${scope}:${nextStatus}`] ??=
        crypto.randomUUID());
      setSaving(true);
      setError("");
      try {
        const result = await recordBoarding(
          api,
          { party, etag },
          nextStatus,
          key,
        );
        if (active()) onRecorded(result);
      } catch (failure) {
        if (!active()) return;
        setError(boardingErrorMessage(failure));
        if (failure.status === 429)
          setRetryAt(
            Date.now() +
              Math.max(1000, (Number(failure.retryAfter) || 30) * 1000),
          );
        if (
          ["BOARDING_NOT_ALLOWED", "BOARDING_ALREADY_RECORDED"].includes(
            failure.code,
          ) ||
          failure.status === 412
        ) {
          try {
            await api.party(party.id, { force: true });
          } catch {
            /* 원래 오류 안내를 유지한다. */
          }
        }
      } finally {
        if (operation.current === controller) operation.current = null;
        if (active()) setSaving(false);
      }
      return;
    }
    onRecorded({
      party: {
        ...party,
        status: nextStatus === "BOARDED" ? "RIDING" : party.status,
        members: party.members.map((member) =>
          member.memberId === party.myMemberId
            ? { ...member, boardingStatus: nextStatus }
            : member,
        ),
      },
    });
  }

  return {
    status,
    recorded,
    record,
    saving,
    error,
    disabledReason:
      isPreview || recorded
        ? null
        : retryAt
          ? "잠시 후 다시 시도해 주세요."
          : getBoardingState(party, now).reason,
  };
}
