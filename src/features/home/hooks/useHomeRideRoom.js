import { useEffect, useState } from "react";
import useSessionStore from "../../../shared/stores/sessionStore";
import { createMatchingApi } from "../../matching/api/matchingApi";
import { loadPartyRoom } from "../../matching/utils/partyFlow";
import { createRideProgressPreview } from "../mocks/rideProgressMock";

export default function useHomeRideRoom(party, isPreview, suppliedRoom) {
  const { status, user, csrfToken } = useSessionStore();
  const [snapshot, setSnapshot] = useState(null);
  const partyId = party?.id;
  const roomId = party?.roomId;
  const memberId = party?.myMemberId;
  const decision = party?.members?.find(
    (member) => member.memberId === memberId,
  )?.decision;
  const scope = `${user?.id}:${partyId}:${roomId}:${memberId}`;
  const current = snapshot?.scope === scope ? snapshot : null;
  useEffect(() => {
    if (
      isPreview ||
      status !== "authenticated" ||
      !partyId ||
      decision !== "ACCEPTED"
    )
      return;
    const controller = new AbortController();
    const api = createMatchingApi(csrfToken, controller.signal);
    let timer;
    async function refresh() {
      try {
        // API-27 조회만 수행한다. 참여 확정이나 계좌 등록은 호출하지 않는다.
        const room = await loadPartyRoom(api, {
          id: partyId,
          roomId,
          myMemberId: memberId,
          members: [{ memberId, decision }],
        });
        if (!controller.signal.aborted) setSnapshot({ scope, room });
      } catch (error) {
        if (controller.signal.aborted) return;
        setSnapshot({ scope, error });
        if ([401, 403, 404, 410].includes(error.status)) return;
      }
      if (!controller.signal.aborted) timer = setTimeout(refresh, 15000);
    }
    refresh();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [
    isPreview,
    status,
    partyId,
    roomId,
    memberId,
    decision,
    csrfToken,
    scope,
  ]);
  const preview = isPreview ? createRideProgressPreview(party) : null;
  return {
    room: isPreview
      ? (suppliedRoom ?? preview?.room)
      : status === "authenticated"
        ? current?.room
        : null,
    preview,
    error: !isPreview ? current?.error : null,
  };
}
