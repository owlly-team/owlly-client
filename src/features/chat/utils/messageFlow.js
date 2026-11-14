const validId = (id) => typeof id === "string" && /^[1-9][0-9]*$/.test(id);
export const compareMessageIds = (a, b) =>
  a.length - b.length || (a < b ? -1 : a > b ? 1 : 0);
export function validateMessage(message, roomId) {
  if (
    !validId(message?.id) ||
    message.roomId !== roomId ||
    !["USER", "SYSTEM"].includes(message.messageType) ||
    (message.messageType === "USER"
      ? !validId(message.senderMemberId)
      : message.senderMemberId !== null) ||
    typeof message.body !== "string" ||
    !Number.isFinite(Date.parse(message.createdAt))
  )
    throw new Error("이 방의 메시지 정보를 확인할 수 없어요.");
  return message;
}
export function validateMessagePage(response, roomId, query = {}) {
  if (
    !Array.isArray(response.data) ||
    !response.meta ||
    typeof response.meta.hasMore !== "boolean"
  )
    throw new Error("채팅 내역을 확인할 수 없어요.");
  const messages = response.data.map((message) =>
    validateMessage(message, roomId),
  );
  const { latestId, nextBeforeId, hasMore } = response.meta;
  const sorted = [...messages].sort((a, b) => compareMessageIds(a.id, b.id));
  if (
    new Set(messages.map((m) => m.id)).size !== messages.length ||
    latestId !== (sorted.at(-1)?.id ?? null) ||
    (query.afterId &&
      messages.some((m) => compareMessageIds(m.id, query.afterId) <= 0)) ||
    (query.beforeId &&
      messages.some((m) => compareMessageIds(m.id, query.beforeId) >= 0)) ||
    (hasMore && !messages.length) ||
    (query.afterId
      ? nextBeforeId !== null
      : nextBeforeId !== (hasMore ? sorted[0]?.id : null))
  )
    throw new Error("채팅 페이지 순서를 확인할 수 없어요.");
  return { messages, latestId, nextBeforeId, hasMore };
}
export function mergeMessages(previous, incoming) {
  const byId = new Map(previous.map((message) => [message.id, message]));
  incoming.forEach((message) => byId.set(message.id, message));
  return [...byId.values()].sort((a, b) => compareMessageIds(a.id, b.id));
}
export function applyMessagePage(state, page, query = {}) {
  return {
    ...state,
    messages: mergeMessages(state.messages, page.messages),
    latestId: query.beforeId
      ? state.latestId
      : (page.latestId ?? state.latestId),
    beforeId:
      query.beforeId || !state.loaded ? page.nextBeforeId : state.beforeId,
    loaded: true,
    error: "",
  };
}
export function createMessageCommand(text, uuid = () => crypto.randomUUID()) {
  if (typeof text !== "string" || !text.trim() || text.length > 200)
    throw new Error(
      "메시지는 공백을 제외한 내용이 있는 200자 이내로 입력해 주세요.",
    );
  return { body: { clientMessageId: uuid(), text }, key: uuid() };
}
export function isRoomAccessError(error) {
  return (
    [401, 403, 404, 410].includes(error.status) ||
    ["ROOM_CLOSED", "ROOM_ACCESS_EXPIRED", "ROOM_NOT_READY"].includes(
      error.code,
    )
  );
}
