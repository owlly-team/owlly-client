export default function Switch({ checked = false, onChange, className = "" }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange?.(!checked)}
      className={`relative h-8 w-13 shrink-0 rounded-full transition-colors ${checked ? "bg-primary-normal" : "bg-fill-strong"} ${className}`}
    >
      <span
        className={`absolute top-1 size-6 rounded-full bg-static-white shadow-xsmall transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`}
      />
    </button>
  );
}
