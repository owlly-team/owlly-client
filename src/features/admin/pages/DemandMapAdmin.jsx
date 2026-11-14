import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import FilterChip from "../../../shared/components/FilterChip";
import StatGrid from "../../../shared/components/StatGrid";
import Badge from "../../../shared/components/Badge";
import MapPlaceholder from "../../demand/components/MapPlaceholder";
import RouteCandidateCard from "../components/RouteCandidateCard";
import AdminTabBar from "../components/AdminTabBar";
import iconStatBars from "../../../assets/icons/stat-bars.svg";
import { routeCandidates as mockRouteCandidates } from "../mockData";
import { fetchDemandCandidates, toRouteSummary } from "../../../shared/api/demandApi";
import { hasApiBaseUrl } from "../../../shared/api/client";
import useReportDraftStore from "../stores/reportDraftStore";

const PERIOD_OPTIONS = ["11.2~11.8", "10.26~11.1", "11.9~11.15"];
const DAY_OPTIONS = ["금요일", "토요일", "일요일", "월요일"];
const TIME_OPTIONS = ["23~01시", "21~23시", "00~02시"];
const WEEKDAY_BY_LABEL = { 일요일: 0, 월요일: 1, 화요일: 2, 수요일: 3, 목요일: 4, 금요일: 5, 토요일: 6 };
const SLOT_START_BY_LABEL = { "23~01시": "23:00", "21~23시": "21:00", "00~02시": "00:00" };

const summaryStats = [
  { value: "1,284", label: "귀가 기록" },
  { value: "312", label: "매칭 실패" },
  { value: "205", label: "혼자 택시" },
  { value: "418", label: "막차 선택" },
];

export default function DemandMapAdmin() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState(PERIOD_OPTIONS[0]);
  const [day, setDay] = useState(DAY_OPTIONS[0]);
  const [time, setTime] = useState(TIME_OPTIONS[0]);
  const [activeTab, setActiveTab] = useState("map");
  const [routes, setRoutes] = useState(
    mockRouteCandidates.map((route) => ({
      id: route.id,
      rank: route.rank,
      title: route.title,
      subtitle: route.subtitle,
      demand: route.demand,
      progress: route.progress,
    })),
  );
  const [notReady, setNotReady] = useState(false);
  const draftCount = useReportDraftStore((state) => Object.keys(state.items).length);

  const cycle = (list, current, setter) => () => {
    setter(list[(list.indexOf(current) + 1) % list.length]);
  };

  useEffect(() => {
    if (!hasApiBaseUrl) return;
    fetchDemandCandidates({
      weekday: WEEKDAY_BY_LABEL[day],
      slotStart: SLOT_START_BY_LABEL[time],
      limit: 20,
    })
      .then(({ data: candidates, meta }) => {
        setRoutes(candidates.map(toRouteSummary));
        setNotReady(false);
        useReportDraftStore.getState().setRunId(meta?.runId ?? null);
      })
      .catch((error) => {
        if (error.code === "DEMAND_NOT_READY") setNotReady(true);
      });
  }, [day, time]);

  return (
    <div className="flex flex-1 flex-col justify-between">
      <div className="flex flex-col gap-4 pt-3">
        <div>
          <h1 className="text-title3 font-bold tracking-tight text-label-normal">
            심야 귀가 수요
          </h1>
          <p className="pt-0.5 text-caption1 text-label-alternative">
            단국대 학생지원팀 · AI 추정
          </p>
        </div>

        <div className="flex gap-2">
          <FilterChip label={period} onClick={cycle(PERIOD_OPTIONS, period, setPeriod)} />
          <FilterChip label={day} onClick={cycle(DAY_OPTIONS, day, setDay)} />
          <FilterChip label={time} onClick={cycle(TIME_OPTIONS, time, setTime)} />
        </div>

        <StatGrid stats={summaryStats} />

        <MapPlaceholder legend={["심야 귀가 흐름 · 굵을수록 많음"]} />

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-headline2 font-bold tracking-tight text-label-normal">
              노선 후보
            </h2>
            <Badge variant="neutral" icon={iconStatBars}>
              AI 추정
            </Badge>
          </div>
          {draftCount > 0 && (
            <button
              type="button"
              onClick={() => navigate("/admin/report")}
              className="flex items-center justify-between rounded-12 bg-fill-normal px-4 py-3 text-left"
            >
              <span className="text-body2 font-semibold text-label-normal">
                선택한 노선 {draftCount}개
              </span>
              <span className="text-body2 font-semibold text-primary-normal">
                리포트 만들기
              </span>
            </button>
          )}
          {notReady ? (
            <p className="py-4 text-center text-caption1 text-label-alternative">
              아직 이 조건으로 집계된 수요 데이터가 없어요.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {routes.map((route) => (
                <RouteCandidateCard
                  key={route.id}
                  rank={route.rank}
                  title={route.title}
                  subtitle={route.subtitle}
                  demand={route.demand}
                  progress={route.progress}
                  onClick={() => navigate(`/admin/routes/${route.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="-mx-4 pt-4">
        <AdminTabBar
          activeTab={activeTab}
          onTabChange={(key) => {
            setActiveTab(key);
            if (key === "report") navigate("/admin/report");
          }}
        />
      </div>
    </div>
  );
}
