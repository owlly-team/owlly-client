export default function Switch({ checked = false, onChange, className = "", labelledBy }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      onClick={() => onChange?.(!checked)}
      className={`relative h-8 w-13 shrink-0 rounded-full outline-none transition-colors ${checked ? "bg-primary-normal" : "bg-fill-strong"} ${className}`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-1 left-1 size-6 rounded-full bg-static-white shadow-xsmall transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`}
      />
    </button>
  );
}
