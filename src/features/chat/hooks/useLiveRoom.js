import { useEffect, useState } from "react";
import useSessionStore from "../../../shared/stores/sessionStore";
import { createMatchingApi } from "../../matching/api/matchingApi";
import {
  loadMatchingResult,
  loadPartyRoom,
} from "../../matching/utils/partyFlow";
import { loadCurrentRide } from "../../home/utils/loadHomeData";
import useCachedParty from "../../matching/hooks/useCachedParty";
import { getSettlementRefreshKey } from "../../settlement/utils/settlementLifecycle";
import { getRoomPhase } from "../utils/prepayUtils";

export default function useLiveRoom({
  enabled,
  partyId,
  roomId,
  contextPartyId,
}) {
  const { status, user, csrfToken } = useSessionStore();
  const [snapshot, setSnapshot] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const scope = `${user?.id}:${partyId ?? contextPartyId ?? ""}:${roomId ?? ""}`;
  const current = snapshot?.scope === scope ? snapshot : null;
  const cached = useCachedParty(
    current?.data?.context.party.id ?? partyId ?? contextPartyId,
    enabled,
  );
  const latestParty = cached?.response?.data ?? current?.data?.context.party;
  const refreshKey = getSettlementRefreshKey(
    latestParty,
    latestParty ? getRoomPhase(latestParty, Date.now(), false) : "",
  );
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
          throw new Error("로그인 후 채팅방을 확인해 주세요.");
        let id = partyId ?? contextPartyId;
        if (!id) {
          const ride = await loadCurrentRide(api);
          if (!roomId || ride.party?.roomId !== roomId)
            throw new Error("이 채팅방의 팟 정보를 확인할 수 없어요.");
          id = ride.party.id;
        }
        const context = await loadMatchingResult(api, id, {
          includeBanks: false,
        });
        const room = await loadPartyRoom(api, context.party, roomId);
        if (controller.signal.aborted) return;
        setSnapshot({
          scope,
          data: {
            context: {
              ...context,
              party: { ...context.party, roomId: room.id },
            },
            room,
            isPreview: false,
          },
        });
        timer = setTimeout(refresh, 15000);
      } catch (error) {
        if (controller.signal.aborted) return;
        const accessDenied =
          [401, 403, 404, 410].includes(error.status) ||
          ["ROOM_NOT_READY", "ROOM_ACCESS_EXPIRED"].includes(error.code);
        setSnapshot((previous) => ({
          scope,
          error,
          ...(!accessDenied && previous?.scope === scope && previous.data
            ? {
                data: {
                  ...previous.data,
                  context: {
                    ...previous.data.context,
                    refreshError:
                      "채팅방 상태를 다시 확인하지 못했어요. 잠시 후 재시도해요.",
                  },
                },
              }
            : {}),
        }));
        if (
          ![401, 403, 404, 410].includes(error.status) &&
          error.code !== "ROOM_ACCESS_EXPIRED"
        )
          timer = setTimeout(refresh, 30000);
      } finally {
        refreshing = false;
      }
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
  }, [
    enabled,
    status,
    scope,
    user?.id,
    csrfToken,
    partyId,
    roomId,
    contextPartyId,
    attempt,
    refreshKey,
  ]);
  return {
    data:
      status !== "authenticated" || cached?.error
        ? undefined
        : current?.data && cached?.response
          ? {
              ...current.data,
              context: {
                ...current.data.context,
                party: {
                  ...cached.response.data,
                  roomId: current.data.room.id,
                },
                partyEtag: cached.response.etag,
              },
            }
          : current?.data,
    loading: enabled && !current,
    error: cached?.error ?? current?.error,
    retry: () => setAttempt((value) => value + 1),
  };
}
