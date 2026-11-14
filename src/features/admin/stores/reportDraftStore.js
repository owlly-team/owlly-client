import { create } from "zustand";

// 관계자가 노선 후보 상세를 여러 번 오가며 "리포트에 담기"로 고른 조치를
// 리포트 화면(ReportExport)에 도착할 때까지 들고 있는다.
const useReportDraftStore = create((set) => ({
  runId: null,
  items: {}, // estimateId -> { action, title }
  reportId: null,

  // 다른 집계 실행(runId)으로 바뀌면 이전 선택은 더 이상 유효하지 않다.
  setRunId: (runId) =>
    set((state) => (state.runId === runId ? state : { runId, items: {}, reportId: null })),

  setAction: (estimateId, action, title) =>
    set((state) => ({
      items: { ...state.items, [estimateId]: { action, title } },
      reportId: null,
    })),

  removeItem: (estimateId) =>
    set((state) => {
      const items = { ...state.items };
      delete items[estimateId];
      return { items, reportId: null };
    }),

  setReportId: (reportId) => set({ reportId }),

  clear: () => set({ runId: null, items: {}, reportId: null }),
}));

export default useReportDraftStore;
