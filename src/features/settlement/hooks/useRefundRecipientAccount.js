import { useEffect, useState } from "react";
import useSessionStore from "../../../shared/stores/sessionStore";
import { createChatApi } from "../../chat/api/chatApi";
import {
  loadRefundRecipientAccount,
  refundRecipientErrorMessage,
} from "../utils/refundRecipientAccount";

export default function useRefundRecipientAccount({
  partyId,
  memberId,
  representativeMemberId,
  transferId,
  isPreview,
}) {
  const { user, status, csrfToken } = useSessionStore();
  const scope = `${user?.id}:${partyId}:${representativeMemberId}:${memberId}:${transferId}`;
  const [snapshot, setSnapshot] = useState(null);
  const current = snapshot?.scope === scope ? snapshot : null;
  useEffect(() => {
    if (isPreview || !transferId || status !== "authenticated") return;
    const controller = new AbortController();
    const api = createChatApi(csrfToken, controller.signal);
    let timer;
    let pending = false;
    let stopped = false;
    let retryAt = 0;
    async function refresh() {
      if (
        pending ||
        stopped ||
        controller.signal.aborted ||
        Date.now() < retryAt
      )
        return;
      pending = true;
      clearTimeout(timer);
      let delay = 15000;
      try {
        const account = await loadRefundRecipientAccount(api, transferId);
        if (
          controller.signal.aborted ||
          useSessionStore.getState().user?.id !== user?.id
        )
          return;
        setSnapshot({ scope, account });
      } catch (error) {
        if (controller.signal.aborted) return;
        // 재조회가 실패하면 이전 계좌 원문을 표시하지 않는다.
        setSnapshot({ scope, error: refundRecipientErrorMessage(error) });
        if (
          [401, 403, 404, 410].includes(error.status) ||
          error.code === "ACCOUNT_EXPIRED"
        )
          stopped = true;
        if (error.status === 429) {
          delay = Math.max(1000, (Number(error.retryAfter) || 30) * 1000);
          retryAt = Date.now() + delay;
        }
      } finally {
        pending = false;
      }
      if (!stopped && !controller.signal.aborted)
        timer = setTimeout(refresh, delay);
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
  }, [scope, transferId, isPreview, status, csrfToken, user?.id]);
  return {
    account:
      !isPreview && transferId && status === "authenticated"
        ? current?.account
        : null,
    notice: current?.error,
    loading: !isPreview && Boolean(transferId) && !current,
  };
}
