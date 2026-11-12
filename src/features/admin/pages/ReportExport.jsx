import { useNavigate } from "react-router-dom";
import TopBar from "../../../shared/components/TopBar";
import Button from "../../../shared/components/Button";
import ReportSummaryCard from "../components/ReportSummaryCard";
import { routeCandidates, reportSummary, ACTION_OPTIONS } from "../mockData";

const actionLabel = (value) =>
  ACTION_OPTIONS.find((option) => option.value === value)?.title ?? "";

export default function ReportExport() {
  const navigate = useNavigate();

  const rows = routeCandidates.map((route) => ({
    rank: route.rank,
    section: route.title,
    demand: route.demand,
    supply: route.supply,
    action: actionLabel(route.action),
  }));

  return (
    <div className="flex flex-1 flex-col justify-between">
      <div>
        <div className="-mx-4">
          <TopBar title="리포트" onLeftClick={() => navigate(-1)} />
        </div>
        <div className="-mx-4 flex flex-col items-center gap-3 bg-background-alternative px-4 py-4">
          <p className="w-full text-caption1 text-label-alternative">
            용인시 제출용 1장 · 고정 양식 · 미리보기
          </p>
          <div className="w-full rounded-16 bg-background-normal p-1 shadow-medium">
            <ReportSummaryCard
              title={reportSummary.title}
              meta={reportSummary.meta}
              stats={reportSummary.stats}
              rows={rows}
              note={reportSummary.note}
            />
            <p className="px-5 pb-4 text-caption2 text-label-alternative">
              {reportSummary.source}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
        <Button variant="secondary" size="md" className="flex-1">
          이미지로 저장
        </Button>
        <Button
          variant="primary"
          size="md"
          className="flex-1"
          style={{ backgroundColor: "#3a3a3c" }}
        >
          PDF로 저장
        </Button>
      </div>
    </div>
  );
}
