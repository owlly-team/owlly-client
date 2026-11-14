import { create } from "zustand";
import { fetchSession, logout as logoutRequest } from "../api/authApi";
import { partyCache } from "../../features/matching/stores/partyCache";
import { rideRequestIndex } from "../../features/matching/stores/rideRequestIndex";

// 로그인 상태는 서버 세션 쿠키가 들고 있고, 여기엔 화면에 필요한 사용자 정보와
// 변경 요청에 매번 실어 보내야 하는 CSRF 토큰만 들고 있는다.
const useSessionStore = create((set, get) => ({
  status: "loading", // "loading" | "authenticated" | "guest"
  user: null,
  csrfToken: null,

  setSession: ({ user, csrfToken }) => {
    partyCache.activate(user?.id);
    rideRequestIndex.activate(user?.id);
    set({ status: "authenticated", user, csrfToken });
  },

  clearSession: () => {
    partyCache.reset();
    rideRequestIndex.clear();
    set({ status: "guest", user: null, csrfToken: null });
  },

  hydrate: async () => {
    try {
      const session = await fetchSession();
      get().setSession(session);
    } catch {
      get().clearSession();
    }
  },

  logout: async () => {
    const { csrfToken } = get();
    try {
      await logoutRequest(csrfToken);
    } finally {
      get().clearSession();
    }
  },
}));

export default useSessionStore;
