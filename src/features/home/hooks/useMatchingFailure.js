import { useEffect, useRef, useState } from "react";
import useSessionStore from "../../../shared/stores/sessionStore";
import { createMatchingApi } from "../../matching/api/matchingApi";
import {
  canResolveFailure,
  loadMatchingFailure,
  recordJourneyChoice,
} from "../utils/matchingFailureData";

export default function useMatchingFailure(
  requestId,
  selection,
  enabled = true,
) {
  const { user, status, csrfToken } = useSessionStore();
  const scope = `${user?.id}:${requestId}`;
  const [snapshot, setSnapshot] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const operation = useRef(null);
  const keys = useRef({});
  const revision = useRef(0);
  const current = snapshot?.scope === scope ? snapshot : null;
  useEffect(() => () => operation.current?.abort(), [scope]);
  useEffect(() => {
    if (!enabled || status === "loading") return;
    const controller = new AbortController();
    let timer;
    async function refresh() {
      if (operation.current) {
        timer = setTimeout(refresh, 1000);
        return;
      }
      const version = revision.current;
      try {
        if (status !== "authenticated")
          throw new Error("로그인 후 매칭 결과를 확인해 주세요.");
        if (!/^[1-9][0-9]*$/.test(requestId ?? ""))
          throw new Error("홈에서 확인할 매칭 신청을 선택해 주세요.");
        const data = await loadMatchingFailure(
          createMatchingApi(csrfToken, controller.signal),
          requestId,
          selection,
        );
        if (
          !controller.signal.aborted &&
          !operation.current &&
          version === revision.current
        )
          setSnapshot({ scope, data });
      } catch (error) {
        if (controller.signal.aborted || version !== revision.current) return;
        setSnapshot({ scope, error });
        if ([401, 403, 404].includes(error.status)) return;
      }
      if (!controller.signal.aborted) timer = setTimeout(refresh, 30000);
    }
    refresh();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [
    enabled,
    status,
    user?.id,
    csrfToken,
    scope,
    requestId,
    selection,
    attempt,
  ]);

  async function choose(mode) {
    if (operation.current || !canResolveFailure(current?.data)) return null;
    const transit = current.data.travelOptions?.transit;
    if (
      mode === "BUS" &&
      (transit?.available !== true ||
        (transit.lastLeaveAt && Date.parse(transit.lastLeaveAt) < Date.now()))
    ) {
      setActionError("막차를 탈 수 있는지 다시 확인해 주세요.");
      setAttempt((value) => value + 1);
      return null;
    }
    const controller = new AbortController();
    operation.current = controller;
    revision.current += 1;
    setSaving(true);
    setActionError("");
    const key = `${scope}:${mode}`;
    keys.current[key] ??= crypto.randomUUID();
    try {
      const api = createMatchingApi(csrfToken, controller.signal);
      const journey = await recordJourneyChoice(
        api,
        current.data,
        mode,
        keys.current[key],
      );
      if (
        controller.signal.aborted ||
        String(useSessionStore.getState().user?.id) !== String(user?.id)
      )
        return null;
      setSnapshot({ scope, data: { ...current.data, journey } });
      return journey;
    } catch (error) {
      if (!controller.signal.aborted) {
        setActionError(
          error.code === "PARTY_LEAVE_REQUIRED"
            ? "이미 팟에 매칭됐어요. 홈에서 매칭 결과를 확인하고 먼저 팟에서 나가 주세요."
            : error.code === "JOURNEY_ALREADY_RESOLVED"
              ? "이미 귀가 방법이 정해졌어요. 홈에서 최신 상태를 확인해 주세요."
              : error.message,
        );
        setAttempt((value) => value + 1);
      }
      return null;
    } finally {
      operation.current = null;
      if (!controller.signal.aborted) setSaving(false);
    }
  }
  return {
    data: current?.data,
    error: current?.error,
    loading: enabled && (!current || status === "loading"),
    saving,
    actionError,
    choose,
    retry: () => setAttempt((value) => value + 1),
  };
}
