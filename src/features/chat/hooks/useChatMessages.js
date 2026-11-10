import { useRef, useState } from "react";
import { chatRoomMockData } from "../mocks/chatRoomMockData";

export default function useChatMessages({ room, myMemberId }) {
  const [messages, setMessages] = useState(() => chatRoomMockData.messages.filter((message) => message.roomId === room.id));
  const [draft, setDraft] = useState("");
  const nextId = useRef(0);

  function send() {
    if (room.status !== "OPEN" || !room.canSendMessage || !draft.trim() || draft.length > 2000) return;
    const message = {
      id: `preview-${++nextId.current}`,
      roomId: room.id,
      senderMemberId: myMemberId ?? chatRoomMockData.context.party.myMemberId,
      messageType: "USER",
      body: draft.replace(/https?:\/\/\S+|www\.\S+|(?:\d[\s-]*){7,}/gi, "[가려진 정보]"),
      createdAt: new Date().toISOString(),
    };
    setMessages((current) => [...current, message]);
    setDraft("");
  }

  return { messages, draft, setDraft, send };
}