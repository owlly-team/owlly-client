/**
 * steps: { time, icon, title, description?, active? }[]
 */
export default function RouteSteps({ steps, className = "" }) {
  return (
    <ol className={`flex w-full flex-col ${className}`}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        return (
          <li key={`${step.time}-${step.title}`} className="relative flex gap-2.5 pb-4">
            <span className="w-11 shrink-0 pt-0.5 text-right text-label1 font-semibold text-label-normal">
              {step.time}
            </span>
            <span className="relative flex shrink-0 flex-col items-center">
              <span
                className={`flex size-7 items-center justify-center rounded-full ${
                  step.active ? "bg-primary-normal" : "bg-accent-cyan-surface"
                }`}
              >
                <img src={step.icon} alt="" className="size-4" />
              </span>
              {!isLast && (
                <span
                  className={`mt-1 w-0.5 flex-1 ${step.active ? "bg-primary-normal" : "bg-accent-cyan"}`}
                />
              )}
            </span>
            <div className="flex flex-col gap-0.5 pt-0.5">
              <p className="text-body2 font-semibold text-label-normal">{step.title}</p>
              {step.description && (
                <p className="text-label2 text-label-alternative">{step.description}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
