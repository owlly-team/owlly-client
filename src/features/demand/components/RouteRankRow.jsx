export default function RouteRankRow({
  rank,
  title,
  subtitle,
  demand,
  demandLabel = "AI 추정 수요",
  progress = 0,
  className = "",
  selected = false,
  onClick,
}) {
  const isRanked = rank !== "–";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-12 bg-background-normal flex w-full flex-col gap-2 border px-4 py-3 text-left ${selected ? "border-primary-normal ring-primary-normal ring-1" : "border-line-alternative"} ${className}`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`text-heading2 w-8 shrink-0 text-center font-bold ${
            isRanked ? "text-accent-cyan" : "text-label-disable"
          }`}
        >
          {rank}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-label1 text-label-normal font-semibold break-words">
            {title}
          </p>
          <p className="text-caption1 text-label-alternative">{subtitle}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <span className="text-label1 text-label-normal font-bold">
            {demand}
          </span>
          <span className="text-caption2 text-label-alternative">
            {demandLabel}
          </span>
        </div>
      </div>
      <div className="bg-fill-normal ml-11 h-1 self-stretch overflow-hidden rounded-full">
        <div
          className="bg-accent-cyan h-full rounded-full"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </button>
  );
}
