import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TopBar from "../../../shared/components/TopBar";
import StatGrid from "../../../shared/components/StatGrid";
import MetricRow from "../../../shared/components/MetricRow";
import Button from "../../../shared/components/Button";
import SelectionCard from "../components/SelectionCard";
import { routeCandidates, ACTION_OPTIONS } from "../mockData";

export default function RouteCandidateDetail() {
  const navigate = useNavigate();
  const { routeId } = useParams();
  const route =
    routeCandidates.find((item) => item.id === routeId) ?? routeCandidates[0];
  const [action, setAction] = useState(route.action);

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
