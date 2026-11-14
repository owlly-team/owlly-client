import { useCallback, useEffect, useState } from "react";
import useSessionStore from "../../../shared/stores/sessionStore";
import { createMatchingApi } from "../../matching/api/matchingApi";
import { loadMatchingResult } from "../../matching/utils/partyFlow";
import useCachedParty from "../../matching/hooks/useCachedParty";
import { getSettlementRefreshKey } from "../utils/settlementLifecycle";

export default function useSettlementData(partyId, enabled = true) {
  const { user, csrfToken, status } = useSessionStore();
  const scope = `${user?.id}:${partyId}`;
  const [snapshot, setSnapshot] = useState(null);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const applyRoute = useCallback(
    (data) => {
      setSnapshot({ scope, data });
      setRevision((value) => value + 1);
    },
    [scope],
  );
  const current = snapshot?.scope === scope ? snapshot : null;
  const cached = useCachedParty(partyId, enabled);
  const refreshKey = getSettlementRefreshKey(cached?.response?.data);
  useEffect(() => {
    if (!enabled || status === "loading") return;
    const controller = new AbortController();
    const api = createMatchingApi(csrfToken, controller.signal);
    let timer;
    let refreshing = false;
    async function refresh() {
      if (refreshing || controller.signal.aborted) return;
      clearTimeout(timer);
      refreshing = true;
      try {
        if (status !== "authenticated")
          throw new Error("로그인 후 정산을 확인해 주세요.");
        const data = await loadMatchingResult(api, partyId, {
          includeBanks: false,
          forceParty: true,
        });
        if (data.settlementError)
          throw new Error("정산 정보를 새로 불러오지 못했어요.");
        if (!controller.signal.aborted) setSnapshot({ scope, data });
      } catch (error) {
        if (controller.signal.aborted) return;
        setSnapshot((previous) =>
          ![401, 403, 404, 410].includes(error.status) &&
          previous?.scope === scope &&
          previous.data
            ? { ...previous, error }
            : { scope, error },
        );
        if ([401, 403, 404, 410].includes(error.status)) return;
      } finally {
        refreshing = false;
      }
      if (!controller.signal.aborted) timer = setTimeout(refresh, 15000);
    }
    const wake = () => {
      if (document.visibilityState !== "hidden") refresh();
    };
    window.addEventListener("focus", wake);
    document.addEventListener("visibilitychange", wake);
    refresh();
    return () => {
      controller.abort();
      clearTimeout(timer);
      window.removeEventListener("focus", wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [enabled, status, partyId, scope, csrfToken, refreshKey, revision]);
  return {
    data:
      enabled && status === "authenticated" && !cached?.error && current?.data
        ? {
            ...current.data,
            party:
              cached?.response?.data?.routeVersion ===
              current.data.settlement?.routeVersion
                ? cached.response.data
                : current.data.party,
          }
        : null,
    loading: enabled && !current,
    error: cached?.error ?? current?.error,
    refresh,
    applyRoute,
  };
}
