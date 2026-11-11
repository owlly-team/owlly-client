import { useLayoutEffect, useRef } from "react";
import ChatBubble from "./ChatBubble";
import ChatInput from "./ChatInput";
import { toChatBubble } from "../hooks/useChatMessages";

export default function RoomConversation({ room, context, canCompose, chat, children }) {
  const list = useRef(null);
  const followLatest = useRef(true);

  useLayoutEffect(() => {
    if (list.current && followLatest.current) list.current.scrollTop = list.current.scrollHeight;
  }, [chat.messages]);

  return <div className="flex min-h-0 flex-1 flex-col">
    <div ref={list} role="log" aria-label="채팅 메시지" aria-live="polite"
      onScroll={(event) => {
        const element = event.currentTarget;
        followLatest.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
      }} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {chat.messages.map((message) => <ChatBubble key={message.id} {...toChatBubble(message, context)} />)}
      {room.status === "CLOSED" && <ChatBubble variant="system" message="채팅방이 닫혔어요. 메시지를 보낼 수 없어요." />}
    </div>
    {children}
    <footer className="-mx-4 shrink-0 bg-background-normal">
      <ChatInput value={chat.draft} onChange={chat.setDraft} onSend={() => { followLatest.current = true; chat.send(); }}
        disabled={!canCompose} placeholder={room.status === "CLOSED" ? "종료된 채팅방이에요" : "메시지 보내기"} className="border-t-0" />
    </footer>
  </div>;
}
