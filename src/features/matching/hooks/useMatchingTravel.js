import { useEffect, useState } from "react";
import useSessionStore from "../../../shared/stores/sessionStore";
import { createMatchingApi } from "../api/matchingApi";
import { loadMatchingTravel } from "../utils/matchingTravel";

export default function useMatchingTravel(partyId, enabled, previous) {
  const { user, csrfToken, status } = useSessionStore();
  const [snapshot, setSnapshot] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const scope = `${user?.id}:${partyId}`;
  const current = snapshot?.scope === scope ? snapshot : null;
  useEffect(() => {
    if (!enabled || status !== "authenticated") return;
    const controller = new AbortController();
    const api = createMatchingApi(csrfToken, controller.signal);
    let timer;
    async function refresh() {
      try {
        const data = await loadMatchingTravel(api, partyId, previous);
        if (controller.signal.aborted) return;
        setSnapshot({ scope, data });
      } catch (error) {
        if (controller.signal.aborted) return;
        // 실패한 갱신에서 이전 막차·요금을 최신 정보처럼 표시하지 않는다.
        setSnapshot({ scope, error: error.message });
        if ([401, 403].includes(error.status)) return;
      }
      timer = setTimeout(refresh, 60000);
    }
    refresh();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [partyId, enabled, previous, scope, csrfToken, status, attempt]);
  return {
    data: enabled && status === "authenticated" ? current?.data : undefined,
    error: current?.error,
    loading: enabled && !current,
    retry: () => setAttempt((value) => value + 1),
  };
}
