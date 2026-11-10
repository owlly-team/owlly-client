export default function RouteCandidateCard({
  rank,
  title,
  subtitle,
  demand,
  demandLabel = "AI 추정 수요",
  progress = 0,
  highlighted = false,
  onClick,
  className = "",
}) {
  const Comp = onClick ? "button" : "div";

  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`flex w-full flex-col gap-1.5 rounded-12 bg-background-normal p-4 text-left ${
        highlighted ? "shadow-[inset_0_0_0_1px_var(--color-primary-normal)]" : ""
      } ${className}`}
    >
      <div className="flex items-center gap-3">
        <span className="w-8 shrink-0 text-center text-heading2 font-bold text-label-alternative">
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
        <div className="h-full rounded-full bg-label-alternative" style={{ width: `${progress}%` }} />
      </div>
    </Comp>
  );
}
