import { useEffect, useRef, useState } from "react";
import useSessionStore from "../../../shared/stores/sessionStore";
import { createMatchingApi } from "../api/matchingApi";

export default function useRideRegistration(source, onCancelled) {
  const { csrfToken, user } = useSessionStore();
  const id = source?.rideRequest?.id ? String(source.rideRequest.id) : null;
  const live = source?.isPreview === false;
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const revision = useRef(0);
  const cancellation = useRef(null);
  const key = useRef(null);
  const rideRequest = snapshot?.id === id ? snapshot.data : source?.rideRequest;
  useEffect(() => () => cancellation.current?.abort(), []);
  useEffect(() => {
    if (!live || !id) return;
    const controller = new AbortController();
    const api = createMatchingApi(csrfToken, controller.signal);
    let timer;
    async function refresh() {
      const version = revision.current;
      try {
        const { data } = await api.rideRequest(id);
        if (controller.signal.aborted || version !== revision.current) return;
        if (data?.id !== id) throw new Error("신청 정보가 일치하지 않아요.");
        setSnapshot({ id, data });
        if (data.status === "WAITING") timer = setTimeout(refresh, 15000);
      } catch (failure) {
        if (controller.signal.aborted || version !== revision.current) return;
        setError(failure.message);
        if (failure.status !== 401 && failure.status !== 403)
          timer = setTimeout(refresh, 30000);
      }
    }
    refresh();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [id, live, csrfToken, user?.id]);

  async function cancel() {
    if (
      !live ||
      !id ||
      cancellation.current ||
      rideRequest?.status !== "WAITING"
    )
      return;
    const controller = new AbortController();
    const api = createMatchingApi(csrfToken, controller.signal);
    cancellation.current = controller;
    revision.current += 1;
    if (key.current?.id !== id)
      key.current = { id, value: crypto.randomUUID() };
    setSaving(true);
    setError("");
    try {
      const { data } = await api.cancelRideRequest(id, key.current.value);
      if (controller.signal.aborted) return;
      if (data?.id !== id || data.status !== "CANCELLED")
        throw new Error("취소 결과를 확인할 수 없어요. 다시 확인해 주세요.");
      setSnapshot({ id, data });
      onCancelled();
    } catch (failure) {
      if (!controller.signal.aborted) {
        setError(
          failure.code === "REQUEST_ALREADY_MATCHED"
            ? "매칭이 완료되어 신청을 취소할 수 없어요. 매칭 결과를 확인해 주세요."
            : failure.message,
        );
        try {
          const { data } = await api.rideRequest(id);
          if (!controller.signal.aborted && data?.id === id)
            setSnapshot({ id, data });
        } catch {
          /* 원래 오류 안내를 유지하고 다음 조회에서 복구한다. */
        }
      }
    } finally {
      cancellation.current = null;
      if (!controller.signal.aborted) setSaving(false);
    }
  }
  return {
    rideRequest,
    error,
    saving,
    cancel,
    live,
    checking: live && id && snapshot?.id !== id,
  };
}
