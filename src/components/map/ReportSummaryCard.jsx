import StatGrid from "../ui/StatGrid";

/**
 * Simplified stand-in for the Figma "리포트 양식" print template.
 * rows: { rank, section, demand, supply, action }[]
 */
export default function ReportSummaryCard({ title, meta, stats, rows, note, className = "" }) {
  return (
    <div className={`flex w-full flex-col gap-4 rounded-16 bg-background-normal p-5 ${className}`}>
      <div className="flex flex-col gap-0.5">
        <p className="text-headline2 font-bold text-label-normal">{title}</p>
        <p className="text-caption1 text-label-alternative">{meta}</p>
      </div>

      <StatGrid stats={stats} columns={3} />

      <div className="flex flex-col gap-1 overflow-x-auto">
        <div className="grid min-w-[480px] grid-cols-[24px_1fr_90px_110px_100px] gap-2 border-b border-fill-normal pb-1.5 text-caption2 text-label-alternative">
          <span>순위</span>
          <span>구간</span>
          <span>AI 추정 수요</span>
          <span>기존 공급</span>
          <span>조치</span>
        </div>
        {rows.map((row) => (
          <div
            key={row.rank}
            className="grid min-w-[480px] grid-cols-[24px_1fr_90px_110px_100px] gap-2 border-b border-fill-alternative py-1.5 text-caption1 text-label-normal"
          >
            <span>{row.rank}</span>
            <span>{row.section}</span>
            <span>{row.demand}</span>
            <span>{row.supply}</span>
            <span>{row.action}</span>
          </div>
        ))}
      </div>

      {note && <p className="text-caption1 text-label-alternative">{note}</p>}
    </div>
  );
}
