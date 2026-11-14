import { create } from "zustand";

// 화면이 바뀌어도 같은 방의 대화는 유지한다. 새로고침 시 서버 내역 조회는 별도 연결한다.
export const useRoomMessagesStore = create((set, get) => ({
  messagesByRoom: {},
  previewSessionsByRoom: {},
  beginPreview: (scope, initialMessages, session) => {
    set((state) =>
      state.previewSessionsByRoom[scope]
        ? state
        : {
            messagesByRoom: {
              ...state.messagesByRoom,
              [scope]: state.messagesByRoom[scope] ?? initialMessages,
            },
            previewSessionsByRoom: {
              ...state.previewSessionsByRoom,
              [scope]: session,
            },
          },
    );
    return get().previewSessionsByRoom[scope];
  },
  resetPreview: () =>
    set((state) => ({
      messagesByRoom: Object.fromEntries(
        Object.entries(state.messagesByRoom).filter(
          ([scope]) => !scope.startsWith("preview:"),
        ),
      ),
      previewSessionsByRoom: {},
    })),
  appendMessage: (scope, initialMessages, message) =>
    set((state) =>
      (state.messagesByRoom[scope] ?? initialMessages).some(
        (item) => item.id === message.id,
      )
        ? state
        : {
            messagesByRoom: {
              ...state.messagesByRoom,
              [scope]: [
                ...(state.messagesByRoom[scope] ?? initialMessages),
                message,
              ],
            },
          },
    ),
}));
