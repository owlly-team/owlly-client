import { useEffect, useRef, useState } from "react";
import useSessionStore from "../../../shared/stores/sessionStore";
import { createMatchingApi } from "../../matching/api/matchingApi";
import {
  confirmTaxiCall,
  getTaxiCallState,
  taxiCallErrorMessage,
} from "../utils/taxiCallFlow";

export default function useTaxiCall({ party, etag, isPreview, onConfirmed }) {
  const { user, csrfToken } = useSessionStore();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [retryAt, setRetryAt] = useState(0);
  const operation = useRef(null);
  const command = useRef(null);
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
  async function confirm() {
    if (operation.current || retryAt) return;
    setError("");
    if (isPreview) {
      onConfirmed?.();
      return;
    }
    const controller = new AbortController();
    operation.current = controller;
    const active = () =>
      !controller.signal.aborted &&
      useSessionStore.getState().user?.id === user?.id;
    const api = createMatchingApi(csrfToken, controller.signal);
    if (command.current?.scope !== scope)
      command.current = { scope, key: crypto.randomUUID() };
    setSaving(true);
    try {
      const result = await confirmTaxiCall(
        api,
        { party, etag },
        command.current.key,
      );
      if (active()) onConfirmed?.(result);
    } catch (failure) {
      if (!active()) return;
      setError(taxiCallErrorMessage(failure));
      if (failure.status === 429)
        setRetryAt(
          Date.now() +
            Math.max(1000, (Number(failure.retryAfter) || 30) * 1000),
        );
      if (failure.status === 412 || failure.code === "INVALID_STATE") {
        try {
          await api.party(party.id, { force: true });
        } catch {
          /* 원래 오류를 유지한다. */
        }
      }
    } finally {
      if (operation.current === controller) operation.current = null;
      if (active()) setSaving(false);
    }
  }
  return {
    confirm,
    saving,
    error,
    disabledReason: isPreview
      ? null
      : retryAt
        ? "잠시 후 다시 시도해 주세요."
        : getTaxiCallState(party, etag).reason,
  };
}
