import { apiGet, apiResponse, hasApiBaseUrl } from "./client";

const useMock = import.meta.env.DEV && !hasApiBaseUrl;

const WEEKDAY_LABEL = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

export function formatWeekdaySlot(weekday, slotStart) {
  return `${WEEKDAY_LABEL[weekday] ?? ""} ${slotStart}`.trim();
}

// RouteCandidateCard/RouteRankRow가 쓰는 rank/title/subtitle/demand/progress 모양으로 변환.
export function toRouteSummary(candidate) {
  const demand =
    candidate.estimatedWeeklyDemand != null
      ? `주 ${Math.round(candidate.estimatedWeeklyDemand)}회`
      : "집계 중";
  const progress = candidate.candidateThreshold
    ? Math.min(100, Math.round((candidate.estimatedWeeklyDemand / candidate.candidateThreshold) * 100))
    : 0;
  return {
    id: candidate.id,
    rank: candidate.candidateRank ?? "–",
    title: `${candidate.pickupPointName} → ${candidate.destinationDongName}`,
    subtitle: candidate.existingSupply || "기존 노선 없음",
    demand,
    progress,
  };
}

function buildQuery(params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, value);
  });
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

// data와 meta.runId를 함께 써야 하는 화면(리포트 생성용 runId 확보 등)이 있어
// 여기만 전체 응답을 반환한다. 호출부에서 { data, meta }로 구조분해한다.
export async function fetchDemandCandidates(params = {}) {
  if (useMock) return { data: [], meta: {} };
  return apiResponse(`/demand/candidates${buildQuery(params)}`);
}

export async function fetchDemandCandidateDetail(estimateId) {
  if (useMock) return null;
  return apiGet(`/demand/candidates/${estimateId}`);
}

export async function fetchMyDemandContribution({ runId, pickupPointId, destinationDongId }) {
  if (useMock) {
    throw Object.assign(new Error("목업 모드예요."), { code: "MOCK_UNSUPPORTED" });
  }
  return apiGet(
    `/me/demand-contribution${buildQuery({ runId, pickupPointId, destinationDongId })}`,
  );
}
