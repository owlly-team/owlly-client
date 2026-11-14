import { useEffect, useMemo, useState } from "react";
import { useRoomMessagesStore } from "../stores/roomMessagesStore.js";
import useLiveMessages from "./useLiveMessages";
import {
  createPreviewConversation,
  schedulePreviewConversation,
} from "../utils/previewConversation";

export default function useChatMessages({
  room,
  myMemberId,
  isPreview = true,
  onUnavailable,
  members,
  previewNow,
}) {
  const live = useLiveMessages({
    room,
    myMemberId,
    enabled: !isPreview,
    onUnavailable,
  });
  const scope = isPreview
    ? `preview:${room.id}:${myMemberId ?? "unknown"}`
    : `live:${room.id}`;
  const conversation = useMemo(
    () =>
      isPreview
        ? createPreviewConversation({ room, myMemberId, members, previewNow })
        : { initialMessages: [], deliveries: [] },
    [isPreview, room, myMemberId, members, previewNow],
  );
  const initialMessages = conversation.initialMessages;
  useEffect(() => {
    if (!isPreview || !myMemberId) return;
    return schedulePreviewConversation({
      room,
      scope,
      conversation,
      store: useRoomMessagesStore,
    });
  }, [isPreview, myMemberId, room, scope, conversation]);
  const messages = useRoomMessagesStore(
    (state) => state.messagesByRoom[scope] ?? initialMessages,
  );
  const appendMessage = useRoomMessagesStore((state) => state.appendMessage);
  const [draft, setDraft] = useState("");

  function previewTimestamp() {
    const session =
      useRoomMessagesStore.getState().previewSessionsByRoom[scope];
    return new Date(
      session
        ? session.clock + Date.now() - session.startedAt
        : (previewNow ?? Date.now()),
    ).toISOString();
  }

  async function send() {
    if (
      room.status !== "OPEN" ||
      !room.canSendMessage ||
      !draft.trim() ||
      draft.length > 200
    )
      return;
    if (!isPreview) {
      const text = draft;
      if (await live.send(text))
        setDraft((current) => (current === text ? "" : current));
      return;
    }
    if (!myMemberId) return;
    const message = {
      id: `preview-${crypto.randomUUID()}`,
      roomId: room.id,
      senderMemberId: myMemberId,
      messageType: "USER",
      body: draft.replace(
        /https?:\/\/\S+|www\.\S+|(?:\d[\s-]*){7,}/gi,
        "[가려진 정보]",
      ),
      createdAt: previewTimestamp(),
    };
    appendMessage(scope, initialMessages, message);
    setDraft("");
  }

  function appendSystemMessage(body) {
    if (!isPreview) return;
    appendMessage(scope, initialMessages, {
      id: crypto.randomUUID(),
      roomId: room.id,
      senderMemberId: null,
      messageType: "SYSTEM",
      body,
      createdAt: previewTimestamp(),
    });
  }

  return {
    ...(!isPreview ? live : { messages }),
    draft,
    setDraft,
    send,
    appendSystemMessage,
  };
}
