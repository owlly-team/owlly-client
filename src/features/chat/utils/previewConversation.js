import { chatRoomMockData } from "../mocks/chatRoomMockData.js";

export function createPreviewConversation({
  room,
  myMemberId,
  members = [],
  previewNow,
}) {
  if (
    !myMemberId ||
    room.id !== chatRoomMockData.room.id ||
    room.partyId !== chatRoomMockData.room.partyId
  )
    return { initialMessages: [], deliveries: [] };
  const others = members.filter(
    (member) =>
      member.memberId &&
      member.memberId !== myMemberId &&
      !["LEFT", "DECLINED", "REMOVED_UNPAID"].includes(member.decision),
  );
  const allowed = new Set(others.map((member) => member.memberId));
  const clock = Number.isFinite(previewNow)
    ? previewNow
    : Date.parse(chatRoomMockData.previewNow);
  const seen = new Set();
  const initialMessages = chatRoomMockData.messages
    .filter((message) => {
      // 고정된 ‘집결 10분 전’ 안내는 현재 시연 시계와 다를 수 있어 제외한다.
      if (message.messageType === "SYSTEM") return message.id !== "6";
      const key = `${message.senderMemberId}:${message.body}`;
      if (!allowed.has(message.senderMemberId) || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((message, index) => ({
      ...message,
      id: `preview-history-${message.id}`,
      createdAt: new Date(
        clock - (chatRoomMockData.messages.length - index) * 10000,
      ).toISOString(),
    }));
  const script = [
    { afterMs: 3000, body: "정문 쪽으로 가고 있어요. 곧 도착해요!" },
    { afterMs: 7000, body: "저는 오른쪽 편의점 앞에서 기다릴게요." },
    { afterMs: 11000, body: "도착하면 확인 코드 맞춰 봐요." },
  ];
  const deliveries = others.length
    ? script.map((entry, index) => ({
        ...entry,
        id: `preview-arrival-${index}`,
        senderMemberId: others[index % others.length].memberId,
      }))
    : [];
  return { initialMessages, deliveries, clock };
}

// 화면 이탈 시 타이머를 정리하고 재입장하면 같은 시작 시각·ID로 이어 간다.
export function schedulePreviewConversation({
  room,
  scope,
  conversation,
  store,
  now = Date.now,
  schedule = setTimeout,
  cancel = clearTimeout,
}) {
  if (
    room.status !== "OPEN" ||
    !room.canSendMessage ||
    !conversation.deliveries.length
  )
    return () => {};
  const session = store
    .getState()
    .beginPreview(scope, conversation.initialMessages, {
      startedAt: now(),
      clock: conversation.clock,
    });
  const existing = new Set(
    (store.getState().messagesByRoom[scope] ?? []).map((message) => message.id),
  );
  const timers = conversation.deliveries
    .filter((delivery) => !existing.has(delivery.id))
    .map((delivery) =>
      schedule(
        () => {
          if (store.getState().previewSessionsByRoom[scope] !== session) return;
          store.getState().appendMessage(scope, conversation.initialMessages, {
            id: delivery.id,
            roomId: room.id,
            senderMemberId: delivery.senderMemberId,
            messageType: "USER",
            body: delivery.body,
            createdAt: new Date(session.clock + delivery.afterMs).toISOString(),
          });
        },
        Math.max(0, session.startedAt + delivery.afterMs - now()),
      ),
    );
  return () => timers.forEach(cancel);
}
