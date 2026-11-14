import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TopBar from "../../../shared/components/TopBar";
import StatGrid from "../../../shared/components/StatGrid";
import MetricRow from "../../../shared/components/MetricRow";
import Button from "../../../shared/components/Button";
import SelectionCard from "../components/SelectionCard";
import { routeCandidates as mockRouteCandidates, ACTION_OPTIONS } from "../mockData";
import { fetchDemandCandidateDetail, formatWeekdaySlot } from "../../../shared/api/demandApi";
import { hasApiBaseUrl } from "../../../shared/api/client";

function toDetailView(candidate) {
  const metrics = [
    { title: "동승 등록", subtitle: "서비스 귀가 기록", value: `${candidate.journeyCount}건` },
    { title: "탑승 확인", subtitle: "서비스 귀가 기록", value: `${candidate.pooledJourneyCount}건` },
    { title: "매칭 실패", subtitle: "서비스 귀가 기록", value: `${candidate.failedJourneyCount}건` },
    { title: "막차 선택", subtitle: "서비스 귀가 기록", value: `${candidate.busSelectedCount}건` },
    { title: "혼자 택시 선택", subtitle: "서비스 귀가 기록", value: `${candidate.soloSelectedCount}건` },
    ...candidate.evidence.map((item) => ({
      title: item.sourceLabel,
      subtitle: item.description,
      value: item.kind === "OBSERVED" ? "관측" : "추정",
    })),
  ];
  return {
    rank: candidate.candidateRank ?? "–",
    title: `${candidate.pickupPointName} → ${candidate.destinationDongName}`,
    meta: formatWeekdaySlot(candidate.weekday, candidate.slotStart),
    stats: [
      {
        value:
          candidate.estimatedWeeklyDemand != null
            ? `주 ${Math.round(candidate.estimatedWeeklyDemand)}회`
            : "집계 중",
        label: "AI 추정 수요",
      },
      { value: `${candidate.failedJourneyCount}건`, label: "매칭 실패" },
      { value: `${candidate.soloSelectedCount}건`, label: "혼자 택시" },
    ],
    metrics,
  };
}

export default function RouteCandidateDetail() {
  const navigate = useNavigate();
  const { routeId } = useParams();
  const mockRoute = mockRouteCandidates.find((item) => item.id === routeId) ?? mockRouteCandidates[0];
  const [route, setRoute] = useState(mockRoute);
  const [action, setAction] = useState(mockRoute.action);

  useEffect(() => {
    if (!hasApiBaseUrl) return;
    fetchDemandCandidateDetail(routeId)
      .then((candidate) => setRoute(toDetailView(candidate)))
      .catch(() => {});
  }, [routeId]);

  return (
    <div className="flex flex-1 flex-col justify-between">
      <div>
        <div className="-mx-4">
          <TopBar title="노선 후보 상세" onLeftClick={() => navigate("/admin")} />
        </div>
        <div className="flex flex-col gap-4 pt-1">
          <div className="flex flex-col gap-1.5">
            <span className="inline-flex w-fit items-center rounded-8 bg-fill-normal px-1.5 py-1 text-caption1 font-medium text-label-normal">
              노선 후보 {route.rank}위
            </span>
            <h1 className="text-title3 font-bold tracking-tight text-label-normal">
              {route.title}
            </h1>
            <p className="text-caption1 text-label-alternative">{route.meta}</p>
          </div>

          <StatGrid stats={route.stats} columns={3} />

          <div className="flex flex-col gap-2">
            <h2 className="text-label2 font-semibold text-label-alternative">
              근거 지표
            </h2>
            <div className="flex flex-col gap-1.5">
              {route.metrics.map((metric) => (
                <MetricRow key={metric.title} {...metric} />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-label2 font-semibold text-label-alternative">
              조치
            </h2>
            <SelectionCard
              options={ACTION_OPTIONS}
              value={action}
              onChange={setAction}
            />
          </div>
        </div>
      </div>

      <div className="pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
        <Button
          size="md"
          variant="primary"
          className="w-full"
          style={{ backgroundColor: "#3a3a3c" }}
          onClick={() => navigate("/admin/report")}
        >
          리포트에 담기
        </Button>
      </div>
    </div>
  );
}
