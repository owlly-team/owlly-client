import { create } from "zustand";
import {
  createMockJourney,
  registerMockJourney,
  matchMockJourney,
  cancelMockJourney,
  updateMockParty,
  resolveMockPickup,
} from "../mocks/mockJourneyFlow.js";
import { useRoomMessagesStore } from "../../chat/stores/roomMessagesStore.js";

// 등록·확정 등 사용자가 수행한 목업 동작의 결과만 화면 사이에 전달한다.
// 모드 전환, 저장소 복원, 전역 타이머는 두지 않는다.
export const useMockJourneyStore = create((set) => ({
  journey: null,
  clear: () => set({ journey: null }),
  register: (registration, selection) => {
    useRoomMessagesStore.getState().resetPreview();
    set(({ journey }) => ({
      journey: registerMockJourney(
        journey ?? createMockJourney(),
        registration,
        selection,
      ),
    }));
  },
  match: () =>
    set(({ journey }) =>
      journey ? { journey: matchMockJourney(journey) } : {},
    ),
  cancel: () =>
    set(({ journey }) =>
      journey ? { journey: cancelMockJourney(journey) } : {},
    ),
  resolvePickup: (point) =>
    set(({ journey }) =>
      journey ? { journey: resolveMockPickup(journey, point) } : {},
    ),
  updateParty: (party) =>
    set(({ journey }) =>
      journey ? { journey: updateMockParty(journey, party) } : {},
    ),
  setAccount: (account) =>
    set(({ journey }) => (journey ? { journey: { ...journey, account } } : {})),
}));
