import { useEffect, useState } from "react";
import { loadMatchingResult } from "../matchingResultApi";
import { mockRepresentativeMatchingResult as mockMatchingResult } from "../matchingMockData";

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

export default function useMatchingResult(partyId, preview) {
  // API 주소가 없는 개발 환경에서만 기존 화면 미리보기를 유지한다.
  const mock = preview ?? (import.meta.env.DEV && !baseUrl ? mockMatchingResult : null);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (mock) return;
    const controller = new AbortController();
    loadMatchingResult(partyId, { baseUrl, signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setResult({ partyId, attempt, data });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setResult({ partyId, attempt, error });
      });
    return () => controller.abort();
  }, [partyId, attempt, mock]);

  const current = result?.partyId === partyId && result.attempt === attempt ? result : null;
  return {
    isPreview: Boolean(mock),
    data: mock?.party?.id === partyId ? mock : current?.data,
    loading: !mock && !current,
    error: mock && mock.party?.id !== partyId ? new Error("팟 정보가 없어요.") : current?.error,
    retry: () => setAttempt((value) => value + 1),
  };
}
