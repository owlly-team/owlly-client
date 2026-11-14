import { useEffect, useRef, useState } from "react";
import useSessionStore from "../../../shared/stores/sessionStore";
import { createSettlementApi } from "../api/settlementApi";
import {
  fareBlockingMessage,
  fareErrorMessage,
  finalizeFare,
  getFareInput,
  validateFarePreview,
} from "../utils/fareFlow";

export default function useFareSettlement({
  context,
  amount,
  enabled,
  refresh,
  onConfirmed,
}) {
  const { user, status, csrfToken } = useSessionStore();
  const input = enabled ? getFareInput(amount, context) : null;
  const scope = `${user?.id}:${context?.party?.id}:${context?.party?.myMemberId}`;
  const requestKey = input
    ? JSON.stringify([scope, input, context.settlementEtag])
    : null;
  const [snapshot, setSnapshot] = useState(null);
  const [failure, setFailure] = useState(null);
  const [saving, setSaving] = useState(false);
  const [retryAt, setRetryAt] = useState(0);
  const operation = useRef(null);
  const keys = useRef(new Map());
  const preview = snapshot?.key === requestKey ? snapshot.data : null;
  const error = failure?.key === requestKey ? failure.message : "";

  useEffect(() => {
    return () => operation.current?.abort();
  }, [scope, enabled, csrfToken]);
  useEffect(() => {
    if (!retryAt) return;
    const timer = setTimeout(
      () => setRetryAt(0),
      Math.max(0, retryAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [retryAt]);

  useEffect(() => {
    if (!enabled || !requestKey || status !== "authenticated") return;
    const controller = new AbortController();
    const api = createSettlementApi(csrfToken, controller.signal);
    const body = getFareInput(amount, context);
    let timer;
    async function calculate() {
      try {
        const response = await api.preview(context.party.id, body);
        const data = validateFarePreview(response.data, body, context);
        if (controller.signal.aborted) return;
        setSnapshot({ key: requestKey, data });
        setFailure(null);
      } catch (error) {
        if (controller.signal.aborted) return;
        setSnapshot(null);
        setFailure({ key: requestKey, message: fareErrorMessage(error) });
        if (
          [412, 428].includes(error.status) ||
          ["ROUTE_VERSION_CONFLICT", "SETTLEMENT_FINALIZED"].includes(
            error.code,
          )
        ) {
          refresh();
        } else if (
          error.status === 429 ||
          !error.status ||
          error.status >= 500
        ) {
          const delay =
            error.status === 429
              ? Math.max(1000, (Number(error.retryAfter) || 30) * 1000)
              : 5000;
          timer = setTimeout(calculate, delay);
        }
      }
    }
    timer = setTimeout(calculate, 350);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [enabled, requestKey, status, csrfToken, amount, context, refresh]);

  async function confirm() {
    if (
      !enabled ||
      !input ||
      !preview?.canFinalize ||
      !context.settlementEtag ||
      status !== "authenticated" ||
      operation.current ||
      retryAt
    )
      return;
    const controller = new AbortController();
    operation.current = controller;
    const active = () =>
      !controller.signal.aborted &&
      useSessionStore.getState().user?.id === user?.id;
    if (!keys.current.has(requestKey))
      keys.current.set(requestKey, crypto.randomUUID());
    setSaving(true);
    setFailure(null);
    try {
      const result = await finalizeFare(
        createSettlementApi(csrfToken, controller.signal),
        context,
        input,
        preview,
        keys.current.get(requestKey),
      );
      if (active()) onConfirmed(result);
    } catch (error) {
      if (!active()) return;
      setFailure({ key: requestKey, message: fareErrorMessage(error) });
      if (error.status === 429)
        setRetryAt(
          Date.now() + Math.max(1000, (Number(error.retryAfter) || 30) * 1000),
        );
      if ([409, 412, 428].includes(error.status)) {
        setSnapshot(null);
        refresh();
      }
    } finally {
      if (operation.current === controller) {
        operation.current = null;
        setSaving(false);
      }
    }
  }

  return {
    preview,
    saving,
    confirm,
    calculating: Boolean(input && !preview && !error),
    canConfirm: Boolean(
      enabled &&
      input &&
      preview?.canFinalize &&
      context.settlementEtag &&
      status === "authenticated" &&
      !retryAt &&
      !saving,
    ),
    notice:
      error ||
      (preview && !preview.canFinalize
        ? fareBlockingMessage(preview.blockingReasons) ||
          "현재 상태에서는 정산을 확정할 수 없어요."
        : ""),
  };
}
