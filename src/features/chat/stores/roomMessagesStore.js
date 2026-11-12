import { create } from "zustand";

// 화면이 바뀌어도 같은 방의 대화는 유지한다. 새로고침 시 서버 내역 조회는 별도 연결한다.
export const useRoomMessagesStore = create((set) => ({
  messagesByRoom: {},
  appendMessage: (scope, initialMessages, message) => set((state) => ({
    messagesByRoom: {
      ...state.messagesByRoom,
      [scope]: [...(state.messagesByRoom[scope] ?? initialMessages), message],
    },
  })),
}));
