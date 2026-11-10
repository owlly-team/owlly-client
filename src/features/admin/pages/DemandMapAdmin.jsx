import { useState } from "react";
import { useNavigate } from "react-router-dom";
import FilterChip from "../../../shared/components/FilterChip";
import StatGrid from "../../../shared/components/StatGrid";
import Badge from "../../../shared/components/Badge";
import MapPlaceholder from "../../demand/components/MapPlaceholder";
import RouteCandidateCard from "../components/RouteCandidateCard";
import AdminTabBar from "../components/AdminTabBar";
import iconStatBars from "../../../assets/icons/stat-bars.svg";
import { routeCandidates } from "../mockData";

const PERIOD_OPTIONS = ["11.2~11.8", "10.26~11.1", "11.9~11.15"];
const DAY_OPTIONS = ["금요일", "토요일", "일요일", "월요일"];
const TIME_OPTIONS = ["23~01시", "21~23시", "00~02시"];

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

  const cycle = (list, current, setter) => () => {
    setter(list[(list.indexOf(current) + 1) % list.length]);
  };

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
          <div className="flex flex-col gap-2">
            {routeCandidates.map((route) => (
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
