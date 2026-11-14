import { useEffect, useRef, useState } from "react";
import { normalizeRefundAccount } from "../utils/memberSettlementUtils";
import useSessionStore from "../../../shared/stores/sessionStore";
import { createMatchingApi } from "../../matching/api/matchingApi";
import { BANK_OPTIONS } from "../../../shared/constants/banks";
import {
  loadRefundSetup,
  registerRefundAccount,
  refundAccountErrorMessage,
} from "../utils/refundAccountFlow";

export default function useMemberSettlement({
  isPreview,
  party,
  settlement,
  onSaved,
}) {
  const { user, status, csrfToken } = useSessionStore();
  const scope = `${user?.id}:${party?.id}:${party?.myMemberId}`;
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [savedAccount, setSavedAccount] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [retryAt, setRetryAt] = useState(0);
  const operation = useRef(null);
  const command = useRef(null);
  const setup = snapshot?.scope === scope ? snapshot.data : null;
  const banks = isPreview ? BANK_OPTIONS : (setup?.banks ?? []);
  const account = normalizeRefundAccount(bankCode, accountNumber, banks);
  const saved = Boolean(savedAccount?.scope === scope);

  useEffect(
    () => () => operation.current?.abort(),
    [scope, csrfToken, isPreview],
  );
  useEffect(() => {
    if (!retryAt) return;
    const timer = setTimeout(
      () => setRetryAt(0),
      Math.max(0, retryAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [retryAt]);
  useEffect(() => {
    if (isPreview || status !== "authenticated" || !party || !settlement)
      return;
    const controller = new AbortController();
    const api = createMatchingApi(csrfToken, controller.signal);
    let timer;
    async function load() {
      try {
        const data = await loadRefundSetup(api, party, settlement);
        if (!controller.signal.aborted) setSnapshot({ scope, data });
      } catch (failure) {
        if (controller.signal.aborted) return;
        setSnapshot({ scope, error: refundAccountErrorMessage(failure) });
        if (
          ![401, 403, 404, 410].includes(failure.status) &&
          !["ROOM_CLOSED", "ROOM_ACCESS_EXPIRED"].includes(failure.code)
        )
          timer = setTimeout(
            load,
            failure.status === 429
              ? Math.max(1000, (Number(failure.retryAfter) || 30) * 1000)
              : 15000,
          );
      }
    }
    load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [isPreview, status, scope, csrfToken, party, settlement]);

  async function submit(event) {
    event.preventDefault();
    if (!account || saved || operation.current || retryAt) return;
    if (isPreview) {
      setSavedAccount({
        scope,
        data: {
          bankCode,
          maskedAccountNumber: `********${accountNumber.slice(-4)}`,
        },
      });
      setAccountNumber("");
      return;
    }
    if (!setup || status !== "authenticated") return;
    const controller = new AbortController();
    operation.current = controller;
    const active = () =>
      !controller.signal.aborted &&
      useSessionStore.getState().user?.id === user?.id;
    setSaving(true);
    setError("");
    try {
      const fingerprint = JSON.stringify([
        scope,
        setup.roomId,
        account,
        setup.holderName,
      ]);
      if (command.current?.fingerprint !== fingerprint)
        command.current = { fingerprint, key: crypto.randomUUID() };
      const data = await registerRefundAccount(
        createMatchingApi(csrfToken, controller.signal),
        { party, settlement },
        setup,
        account,
        command.current.key,
      );
      if (!active()) return;
      setSavedAccount({ scope, data });
      setBankCode("");
      setAccountNumber("");
      command.current = null;
      onSaved?.();
    } catch (failure) {
      if (!active()) return;
      setError(refundAccountErrorMessage(failure));
      if (failure.status === 429)
        setRetryAt(
          Date.now() +
            Math.max(1000, (Number(failure.retryAfter) || 30) * 1000),
        );
    } finally {
      if (operation.current === controller) {
        operation.current = null;
        setSaving(false);
      }
    }
  }

  return {
    bankCode,
    setBankCode,
    accountNumber,
    setAccountNumber,
    saved,
    banks,
    saving,
    savedAccount: saved ? savedAccount.data : null,
    notice: error || (snapshot?.scope === scope ? snapshot.error : ""),
    loading: !isPreview && !snapshot,
    canSubmit:
      Boolean(account) &&
      !saved &&
      !saving &&
      !retryAt &&
      (isPreview || (setup && status === "authenticated")),
    submit,
  };
}
