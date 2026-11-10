export default function RouteRankRow({
  rank,
  title,
  subtitle,
  demand,
  demandLabel = "AI 추정 수요",
  progress = 0,
  className = "",
}) {
  const isRanked = rank !== "–";

  return (
    <div
      className={`flex w-full flex-col gap-1.5 rounded-12 bg-background-normal px-4 py-3 ${className}`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`w-8 shrink-0 text-center text-heading2 font-bold ${
            isRanked ? "text-label-alternative" : "text-label-disable"
          }`}
        >
          {rank}
        </span>
        <div className="flex flex-1 flex-col gap-0.5">
          <p className="text-body2 font-semibold text-label-normal">{title}</p>
          <p className="text-caption1 text-label-alternative">{subtitle}</p>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-label1 font-bold text-label-normal">{demand}</span>
          <span className="text-caption2 text-label-alternative">{demandLabel}</span>
        </div>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-fill-normal">
        <div
          className="h-full rounded-full bg-label-alternative"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
