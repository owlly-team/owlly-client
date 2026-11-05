export default function ReportReasonButton({ label, selected = false, onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-16 px-5 py-3 text-left ${className}`}
    >
      <span
        className={`size-[22px] shrink-0 rounded-full ${
          selected ? "bg-primary-normal" : "shadow-[inset_0_0_0_1.5px_var(--color-fill-strong)]"
        }`}
      />
      <span className="text-body2 text-label-normal">{label}</span>
    </button>
  );
}
