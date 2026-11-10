/**
 * options: { value, label }[]
 */
export default function GenderToggle({ value, onChange, options, className = "" }) {
  return (
    <div className={`grid grid-cols-2 gap-1.5 rounded-12 bg-fill-normal p-1 ${className}`}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange?.(option.value)}
            className={`flex h-11 items-center justify-center rounded-10 text-body2 font-semibold transition-colors ${
              selected
                ? "bg-background-normal text-label-normal shadow-xsmall"
                : "text-label-alternative"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
