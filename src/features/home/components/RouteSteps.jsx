/**
 * steps: { time, type: "walk" | "transit" | "home", icon, title, description? }[]
 */

const STEP_BACKGROUNDS = {
  walk: "bg-fill-normal",
  transit: "bg-accent-cyan-surface",
  home: "bg-primary-normal",
};

const STEP_LINES = {
  walk: "bg-line-normal",
  transit: "bg-accent-cyan",
  home: "bg-primary-normal",
};

export default function RouteSteps({ steps = [], className = "" }) {
  return (
    <ol className={`flex w-full flex-col ${className}`}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1; //인덱스 배열의 마지막과 같으면 true
        return (
          <li key={`${step.time}-${step.title}`} className="grid grid-cols-[2.75rem_1.75rem_minmax(0,1fr)] gap-x-2.5">
            <span className="w-11 shrink-0 pt-0.5 text-right text-label1 font-semibold text-label-normal">
              {step.time}
            </span>
            <span className="relative" aria-hidden="true">
              <span className={`flex size-7 items-center justify-center rounded-full 
                    ${STEP_BACKGROUNDS[step.type] ?? STEP_BACKGROUNDS.walk}`}
              >
                <img src={step.icon} alt="" className="size-4" />
              </span>
              {!isLast && (
                <span
                  className={`absolute top-7 bottom-0 left-1/2 w-[2px] -translate-x-1/2 ${STEP_LINES[step.type] ?? STEP_LINES.walk}`}
                />
              )}
            </span>
            <div className="flex min-h-7 flex-col gap-0.5 pt-0.5 pb-4">
              <p className="text-body2 font-semibold text-label-normal">{step.title}</p>
              {step.description && (
                <p className="text-label2 text-label-neutral">{step.description}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
