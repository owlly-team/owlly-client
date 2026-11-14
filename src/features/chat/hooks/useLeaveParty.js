import { useEffect, useRef, useState } from "react";
import { leaveMockParty } from "../utils/leavePartyUtils";
import { leaveLiveParty } from "../utils/leaveLiveParty";
import { createMatchingApi } from "../../matching/api/matchingApi";
import useSessionStore from "../../../shared/stores/sessionStore";

export default function useLeaveParty({
  party,
  now,
  transfers,
  onLeft,
  isPreview = true,
  etag,
}) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const { user, csrfToken } = useSessionStore();
  const operation = useRef(null);
  const key = useRef(null);
  const scope = `${user?.id}:${party?.id}:${party?.myMemberId}`;
  useEffect(() => () => operation.current?.abort(), [scope, isPreview]);

  async function leaveLive() {
    if (operation.current) return false;
    const controller = new AbortController();
    operation.current = controller;
    const api = createMatchingApi(csrfToken, controller.signal);
    const active = () =>
      !controller.signal.aborted &&
      useSessionStore.getState().user?.id === user?.id;
    if (key.current?.scope !== scope)
      key.current = { scope, value: crypto.randomUUID() };
    setError("");
    setSaving(true);
    try {
      const updated = await leaveLiveParty(
        api,
        {
          party,
          etag,
          now: Date.now(),
          transfers,
        },
        key.current.value,
      );
      if (!active()) return false;
      onLeft(updated);
      return true;
    } catch (failure) {
      if (!active()) return false;
      setError(
        failure.status === 412
          ? "팟 정보가 변경됐어요. 최신 정보를 확인한 뒤 다시 시도해 주세요."
          : failure.message,
      );
      // 확정적으로 거절된 요청은 새 키로 재시도하고, 응답 손실 시 키를 유지한다.
      if (
        failure.status >= 400 &&
        failure.status < 500 &&
        failure.status !== 408
      )
        key.current = null;
      try {
        await api.party(party.id, { force: true });
      } catch {
        /* 원래 오류를 유지한다. 접근 오류는 공통 캐시에서 처리한다. */
      }
      return false;
    } finally {
      if (operation.current === controller) operation.current = null;
      if (active()) setSaving(false);
    }
  }

  function leave() {
    if (!isPreview) return leaveLive();
    setError("");
    try {
      onLeft(leaveMockParty(party, { now, transfers }));
      return true;
    } catch (failure) {
      setError(failure.message);
      return false;
    }
  }

  return { leave, error, saving };
}
