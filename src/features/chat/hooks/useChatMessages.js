import { useMemo, useState } from "react";
import { chatRoomMockData } from "../mocks/chatRoomMockData.js";
import { useRoomMessagesStore } from "../stores/roomMessagesStore.js";
import useLiveMessages from "./useLiveMessages";

export function toChatBubble(message, context) {
  const party = context?.party;
  const member = party?.members?.find(
    (item) => item.memberId === message.senderMemberId,
  );
  const isSystem = message.messageType === "SYSTEM";
  return {
    id: message.id,
    variant: isSystem
      ? "system"
      : party?.myMemberId && message.senderMemberId === party.myMemberId
        ? "outgoing"
        : "incoming",
    sender: isSystem ? undefined : (member?.maskedName ?? "멤버"),
    message: message.body,
  };
}

export default function useChatMessages({
  room,
  myMemberId,
  isPreview = true,
  onUnavailable,
}) {
  const live = useLiveMessages({
    room,
    myMemberId,
    enabled: !isPreview,
    onUnavailable,
  });
  const scope = `${isPreview ? "preview" : "live"}:${room.id}`;
  const initialMessages = useMemo(
    () =>
      isPreview
        ? chatRoomMockData.messages.filter(
            (message) => message.roomId === room.id,
          )
        : [],
    [isPreview, room.id],
  );
  const messages = useRoomMessagesStore(
    (state) => state.messagesByRoom[scope] ?? initialMessages,
  );
  const appendMessage = useRoomMessagesStore((state) => state.appendMessage);
  const [draft, setDraft] = useState("");

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
    const message = {
      id: `preview-${crypto.randomUUID()}`,
      roomId: room.id,
      senderMemberId: myMemberId ?? chatRoomMockData.context.party.myMemberId,
      messageType: "USER",
      body: draft.replace(
        /https?:\/\/\S+|www\.\S+|(?:\d[\s-]*){7,}/gi,
        "[가려진 정보]",
      ),
      createdAt: new Date().toISOString(),
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
      createdAt: new Date().toISOString(),
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
