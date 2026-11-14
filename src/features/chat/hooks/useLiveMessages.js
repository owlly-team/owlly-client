import { useEffect, useRef, useState } from "react";
import useSessionStore from "../../../shared/stores/sessionStore";
import { createChatApi } from "../api/chatApi";
import {
  applyMessagePage,
  createMessageCommand,
  isRoomAccessError,
  mergeMessages,
  validateMessage,
  validateMessagePage,
} from "../utils/messageFlow";

export default function useLiveMessages({
  room,
  myMemberId,
  enabled,
  onUnavailable,
}) {
  const { user, csrfToken, status } = useSessionStore();
  const scope = `${user?.id}:${room.id}:${myMemberId}`;
  const [snapshot, setSnapshot] = useState(null);
  const live = useRef(null);
  const callback = useRef(onUnavailable);
  useEffect(() => {
    callback.current = onUnavailable;
  }, [onUnavailable]);
  useEffect(() => {
    if (!enabled || status !== "authenticated" || room.status !== "OPEN")
      return;
    const controller = new AbortController();
    const api = createChatApi(csrfToken, controller.signal);
    const session = {
      scope,
      messages: [],
      latestId: null,
      beforeId: null,
      loaded: false,
      loadingOlder: false,
      sending: false,
      error: "",
      sendError: "",
      command: null,
      retryUntil: 0,
      stopped: false,
    };
    live.current = session;
    let timer;
    const active = () =>
      !controller.signal.aborted &&
      !session.stopped &&
      useSessionStore.getState().user?.id === user?.id;
    const publish = () => {
      if (active()) setSnapshot({ ...session });
    };
    const fail = (error, sending = false) => {
      if (!active()) return;
      if (isRoomAccessError(error)) {
        session.stopped = true;
        controller.abort();
        callback.current?.(error);
        return;
      }
      if (error.status === 429)
        session.retryUntil =
          Date.now() + Math.max(1000, (Number(error.retryAfter) || 30) * 1000);
      if (sending)
        session.sendError =
          error.status === 429
            ? "전송이 많아요. 잠시 후 다시 보내 주세요."
            : error.message;
      else session.error = error.message;
      publish();
    };
    async function refresh() {
      if (!active() || session.polling) return;
      clearTimeout(timer);
      if (Date.now() < session.retryUntil) {
        timer = setTimeout(refresh, session.retryUntil - Date.now());
        return;
      }
      session.polling = true;
      try {
        let more;
        do {
          const query =
            session.loaded && session.latestId
              ? { afterId: session.latestId }
              : {};
          const page = validateMessagePage(
            await api.messages(room.id, query),
            room.id,
            query,
          );
          if (!active()) return;
          Object.assign(session, applyMessagePage(session, page, query));
          more = Boolean(query.afterId && page.hasMore);
          session.error = "";
          publish();
        } while (more && active());
      } catch (error) {
        fail(error);
      } finally {
        session.polling = false;
        if (active())
          timer = setTimeout(
            refresh,
            Math.max(3000, session.retryUntil - Date.now()),
          );
      }
    }
    session.refresh = refresh;
    session.loadOlder = async () => {
      if (
        !active() ||
        !session.beforeId ||
        session.loadingOlder ||
        Date.now() < session.retryUntil
      )
        return false;
      session.loadingOlder = true;
      publish();
      try {
        const query = { beforeId: session.beforeId };
        const page = validateMessagePage(
          await api.messages(room.id, query),
          room.id,
          query,
        );
        if (!active()) return false;
        Object.assign(session, applyMessagePage(session, page, query));
        publish();
        return true;
      } catch (error) {
        fail(error);
        return false;
      } finally {
        session.loadingOlder = false;
        publish();
      }
    };
    session.send = async (text) => {
      if (
        !active() ||
        session.sending ||
        !room.canSendMessage ||
        Date.now() < session.retryUntil
      )
        return false;
      session.sending = true;
      session.sendError = "";
      publish();
      try {
        if (session.command?.body.text !== text)
          session.command = createMessageCommand(text);
        const response = await api.send(
          room.id,
          session.command.body,
          session.command.key,
        );
        const message = validateMessage(response.data, room.id);
        if (
          message.messageType !== "USER" ||
          message.senderMemberId !== myMemberId
        )
          throw new Error("메시지 전송 결과를 확인할 수 없어요.");
        if (!active()) return false;
        session.messages = mergeMessages(session.messages, [message]);
        // 전송 응답으로 조회 커서를 옮기면 그 사이 다른 멤버의 메시지를 건너뛸 수 있다.
        session.command = null;
        publish();
        return true;
      } catch (error) {
        fail(error, true);
        return false;
      } finally {
        session.sending = false;
        publish();
      }
    };
    refresh();
    return () => {
      controller.abort();
      clearTimeout(timer);
      if (live.current === session) live.current = null;
    };
  }, [
    enabled,
    status,
    scope,
    room.id,
    room.status,
    room.canSendMessage,
    myMemberId,
    user?.id,
    csrfToken,
  ]);
  const current = enabled && snapshot?.scope === scope ? snapshot : null;
  return {
    messages: current?.messages ?? [],
    loading: enabled && !current?.loaded,
    error: current?.error,
    sendError: current?.sendError,
    sending: current?.sending ?? false,
    hasOlder: Boolean(current?.beforeId),
    loadingOlder: current?.loadingOlder ?? false,
    retry: () => live.current?.refresh(),
    loadOlder: () => live.current?.loadOlder(),
    send: (text) => live.current?.send(text),
  };
}
