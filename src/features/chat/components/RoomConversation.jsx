import { useLayoutEffect, useRef } from "react";
import ChatBubble from "./ChatBubble";
import ChatInput from "./ChatInput";
import { toChatBubble } from "../utils/chatMessageUtils";

export default function RoomConversation({
  room,
  context,
  canCompose,
  chat,
  children,
}) {
  const list = useRef(null);
  const followLatest = useRef(true);
  const olderAnchor = useRef(null);
  const lastScrollTop = useRef(0);

  async function loadPreviousMessages(element) {
    if (!chat.hasOlder || chat.loadingOlder || olderAnchor.current) return;
    followLatest.current = false;
    olderAnchor.current = {
      top: element.scrollTop,
      height: element.scrollHeight,
    };
    if (!(await chat.loadOlder())) olderAnchor.current = null;
  }

  useLayoutEffect(() => {
    if (list.current && olderAnchor.current && !chat.loadingOlder) {
      list.current.scrollTop =
        olderAnchor.current.top +
        list.current.scrollHeight -
        olderAnchor.current.height;
      olderAnchor.current = null;
    } else if (list.current && !olderAnchor.current && followLatest.current)
      list.current.scrollTop = list.current.scrollHeight;
    if (list.current) lastScrollTop.current = list.current.scrollTop;
  }, [chat.messages, chat.loadingOlder]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={list}
        role="log"
        aria-label="채팅 메시지"
        aria-live="polite"
        onScroll={(event) => {
          const element = event.currentTarget;
          const movingUp = element.scrollTop < lastScrollTop.current;
          lastScrollTop.current = element.scrollTop;
          followLatest.current =
            element.scrollHeight - element.scrollTop - element.clientHeight <
            80;
          if (movingUp && element.scrollTop <= 32)
            loadPreviousMessages(element);
        }}
        className="flex min-h-0 flex-1 [scrollbar-width:none] flex-col gap-2 overflow-y-auto py-3 [&::-webkit-scrollbar]:hidden"
      >
        {chat.loading && !chat.error && (
          <p role="status" className="text-caption1 text-label-neutral">
            대화를 불러오고 있어요.
          </p>
        )}
        {chat.error && (
          <div role="alert" className="text-label2 text-label-neutral">
            <p>{chat.error}</p>
          </div>
        )}
        {chat.messages.map((message) => (
          <ChatBubble key={message.id} {...toChatBubble(message, context)} />
        ))}
        {room.status === "CLOSED" && (
          <ChatBubble
            variant="system"
            message="채팅방이 닫혔어요. 메시지를 보낼 수 없어요."
          />
        )}
      </div>
      {children}
      {chat.sendError && (
        <p role="alert" className="text-label2 text-status-negative py-2">
          {chat.sendError}
        </p>
      )}
      <footer className="bg-background-normal -mx-4 shrink-0">
        <ChatInput
          value={chat.draft}
          onChange={chat.setDraft}
          onSend={() => {
            followLatest.current = true;
            chat.send();
          }}
          disabled={!canCompose || chat.sending}
          placeholder={
            room.status === "CLOSED"
              ? "종료된 채팅방이에요"
              : chat.sending
                ? "전송 중"
                : "메시지 보내기"
          }
          className="border-t-0"
        />
      </footer>
    </div>
  );
}
