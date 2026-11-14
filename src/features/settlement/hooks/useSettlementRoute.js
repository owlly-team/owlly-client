import { useEffect, useRef, useState } from "react";
import useSessionStore from "../../../shared/stores/sessionStore";
import { createSettlementApi } from "../api/settlementApi";
import { getRoutePatch, updateSettlementRoute } from "../utils/routeFlow";
import { fareErrorMessage } from "../utils/fareFlow";

export default function useSettlementRoute({
  context,
  enabled,
  onUpdated,
  refresh,
}) {
  const { user, csrfToken, status } = useSessionStore();
  const scope = `${user?.id}:${context.party?.id}:${context.party?.myMemberId}`;
  const operation = useRef(null);
  const keys = useRef(new Map());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [retryAt, setRetryAt] = useState(0);
  useEffect(
    () => () => operation.current?.abort(),
    [scope, enabled, csrfToken],
  );
  useEffect(() => {
    if (!retryAt) return;
    const timer = setTimeout(
      () => setRetryAt(0),
      Math.max(0, retryAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [retryAt]);

  async function update(orderedMemberIds) {
    if (!enabled || status !== "authenticated" || operation.current || retryAt)
      return false;
    const controller = new AbortController();
    operation.current = controller;
    const active = () =>
      !controller.signal.aborted &&
      useSessionStore.getState().user?.id === user?.id;
    setSaving(true);
    setError("");
    try {
      const input = getRoutePatch(context, orderedMemberIds);
      const fingerprint = JSON.stringify([
        scope,
        context.settlementEtag,
        input,
      ]);
      if (!keys.current.has(fingerprint))
        keys.current.set(fingerprint, crypto.randomUUID());
      const result = await updateSettlementRoute(
        createSettlementApi(csrfToken, controller.signal),
        context,
        orderedMemberIds,
        keys.current.get(fingerprint),
      );
      if (!active()) return false;
      onUpdated(result);
      return true;
    } catch (failure) {
      if (!active()) return false;
      setError(fareErrorMessage(failure));
      if ([409, 412, 428].includes(failure.status)) refresh();
      if (failure.status === 429)
        setRetryAt(
          Date.now() +
            Math.max(1000, (Number(failure.retryAfter) || 30) * 1000),
        );
      return false;
    } finally {
      if (operation.current === controller) {
        operation.current = null;
        setSaving(false);
      }
    }
  }
  return { update, saving, error, disabled: Boolean(retryAt) };
}
