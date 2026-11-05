/**
 * options: { value, title, description }[]
 */
export default function SelectionCard({ options, value, onChange, className = "" }) {
  return (
    <div className={`flex w-full flex-col gap-2.5 ${className}`}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange?.(option.value)}
            className={`flex flex-col items-start gap-0.5 rounded-12 px-3.5 py-3 text-left ${
              selected
                ? "bg-primary-tint shadow-[inset_0_0_0_1px_var(--color-primary-normal)]"
                : "shadow-[inset_0_0_0_1px_var(--color-fill-strong)]"
            }`}
          >
            <span className="text-body2 font-semibold text-label-normal">
              {option.title}
            </span>
            <span className="text-caption1 text-label-alternative">
              {option.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
