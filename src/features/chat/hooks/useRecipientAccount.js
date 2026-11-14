import { useEffect, useState } from "react";
import useSessionStore from "../../../shared/stores/sessionStore";
import { createChatApi } from "../api/chatApi";
import { getMyPrepayTransferId } from "../utils/prepayUtils";
import {
  loadPrepayRecipientAccount,
  recipientAccountErrorMessage,
} from "../utils/recipientAccount";

export default function useRecipientAccount({ party, settlement, isPreview }) {
  const { user, status, csrfToken } = useSessionStore();
  const transferId = getMyPrepayTransferId(party, settlement);
  const scope = `${user?.id}:${party.id}:${party.myMemberId}:${party.representativeMemberId}:${transferId}`;
  const [snapshot, setSnapshot] = useState(null);
  const current = snapshot?.scope === scope ? snapshot : null;
  useEffect(() => {
    if (isPreview || !transferId || status !== "authenticated") return;
    const controller = new AbortController();
    const api = createChatApi(csrfToken, controller.signal);
    let timer;
    async function refresh() {
      try {
        const account = await loadPrepayRecipientAccount(api, transferId);
        if (
          controller.signal.aborted ||
          useSessionStore.getState().user?.id !== user?.id
        )
          return;
        setSnapshot({ scope, account });
      } catch (error) {
        if (controller.signal.aborted) return;
        // 재조회가 실패하면 이전 원문 계좌를 다시 노출하거나 복사하지 않는다.
        setSnapshot({ scope, error: recipientAccountErrorMessage(error) });
        if (
          [401, 403, 404, 410].includes(error.status) ||
          error.code === "ACCOUNT_EXPIRED"
        )
          return;
        timer = setTimeout(
          refresh,
          error.status === 429
            ? Math.max(1000, (Number(error.retryAfter) || 30) * 1000)
            : 15000,
        );
        return;
      }
      timer = setTimeout(refresh, 15000);
    }
    refresh();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [scope, isPreview, transferId, status, csrfToken, user?.id]);
  return {
    account:
      !isPreview && transferId && status === "authenticated"
        ? current?.account
        : null,
    error: current?.error,
    loading: !isPreview && Boolean(transferId) && !current,
    missingTransfer: !isPreview && !transferId,
  };
}
