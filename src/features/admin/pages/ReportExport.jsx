import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import TopBar from "../../../shared/components/TopBar";
import Button from "../../../shared/components/Button";
import ReportSummaryCard from "../components/ReportSummaryCard";
import { routeCandidates, reportSummary, ACTION_OPTIONS } from "../mockData";

const actionLabel = (value) =>
  ACTION_OPTIONS.find((option) => option.value === value)?.title ?? "";

const FILE_NAME = `아울리_심야수요_${reportSummary.school}_${reportSummary.period}`;

// 리포트 표(min-w-480px)가 모바일 화면 폭(Layout의 max-w-110)보다 넓어서
// 화면에서는 가로 스크롤로 잘려 보인다. 내보낼 땐 "고정 양식 1장"이 전부
// 보여야 하므로, 화면 밖(position:fixed로 레이아웃 폭 제약을 벗어난 자리)에
// 표가 스크롤 없이 다 들어가는 폭으로 미리 그려둔 사본을 캡처한다.
const EXPORT_WIDTH = 560;

function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export default function ReportExport() {
  const navigate = useNavigate();
  const exportRef = useRef(null);
  const [exporting, setExporting] = useState(null); // "image" | "pdf" | null
  const [exportError, setExportError] = useState("");

  const captureExportCanvas = () =>
    html2canvas(exportRef.current, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      width: EXPORT_WIDTH,
      windowWidth: EXPORT_WIDTH,
    });

  const handleSaveImage = async () => {
    if (exporting || !exportRef.current) return;
    setExporting("image");
    setExportError("");
    try {
      const canvas = await captureExportCanvas();
      downloadDataUrl(canvas.toDataURL("image/png"), `${FILE_NAME}.png`);
    } catch {
      setExportError("이미지 저장에 실패했어요. 다시 시도해 주세요.");
    } finally {
      setExporting(null);
    }
  };

  const handleSavePdf = async () => {
    if (exporting || !exportRef.current) return;
    setExporting("pdf");
    setExportError("");
    try {
      const canvas = await captureExportCanvas();
      const pdf = new jsPDF({
        orientation: canvas.width >= canvas.height ? "landscape" : "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`${FILE_NAME}.pdf`);
    } catch {
      setExportError("PDF 저장에 실패했어요. 다시 시도해 주세요.");
    } finally {
      setExporting(null);
    }
  };

  const rows = routeCandidates.map((route) => ({
    rank: route.rank,
    section: route.title,
    demand: route.demand,
    supply: route.supply,
    action: actionLabel(route.action),
  }));

  const reportBody = (
    <>
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
    </>
  );

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
            {reportBody}
          </div>
        </div>
      </div>

      {/* 캡처 전용 사본 — 화면에는 안 보이고, 내보낼 때만 렌더링된 걸 캡처한다 */}
      <div
        aria-hidden="true"
        className="fixed top-0 -left-[9999px] bg-background-normal"
        style={{ width: EXPORT_WIDTH }}
        ref={exportRef}
      >
        {reportBody}
      </div>

      <div className="flex flex-col gap-2 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
        {exportError && (
          <p className="text-center text-caption1 text-status-negative">{exportError}</p>
        )}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="md"
            className="flex-1"
            disabled={exporting !== null}
            onClick={handleSaveImage}
          >
            {exporting === "image" ? "저장 중..." : "이미지로 저장"}
          </Button>
          <Button
            variant="primary"
            size="md"
            className="flex-1"
            style={{ backgroundColor: "#3a3a3c" }}
            disabled={exporting !== null}
            onClick={handleSavePdf}
          >
            {exporting === "pdf" ? "저장 중..." : "PDF로 저장"}
          </Button>
        </div>
      </div>
    </div>
  );
}
