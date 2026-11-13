import { useEffect, useState } from "react";
import useSessionStore from "../../../shared/stores/sessionStore";
import { createMatchingApi } from "../../matching/api/matchingApi";
import {
  loadMatchingResult,
  loadPartyRoom,
} from "../../matching/utils/partyFlow";
import { loadCurrentRide } from "../../home/utils/loadHomeData";

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
  useEffect(() => {
    if (!enabled || status === "loading") return;
    const controller = new AbortController();
    const api = createMatchingApi(csrfToken, controller.signal);
    let timer;
    async function refresh() {
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
        setSnapshot({ scope, error });
        if (
          ![401, 403, 404, 410].includes(error.status) &&
          error.code !== "ROOM_ACCESS_EXPIRED"
        )
          timer = setTimeout(refresh, 30000);
      }
    }
    refresh();
    return () => {
      controller.abort();
      clearTimeout(timer);
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
  ]);
  return {
    data: current?.data,
    loading: enabled && !current,
    error: current?.error,
    retry: () => setAttempt((value) => value + 1),
  };
}
