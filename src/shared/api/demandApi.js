import { apiGet, hasApiBaseUrl } from "./client";

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
    subtitle: formatWeekdaySlot(candidate.weekday, candidate.slotStart),
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

export async function fetchDemandCandidates(params = {}) {
  if (useMock) return [];
  return apiGet(`/demand/candidates${buildQuery(params)}`);
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
