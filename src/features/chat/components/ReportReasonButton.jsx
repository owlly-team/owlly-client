export default function ReportReasonButton({ label, selected = false, onClick, className = "", name = "report-reason", value = label, disabled = false }) {
  return (
    <label
      className={`flex w-full cursor-pointer items-center gap-3 rounded-16 px-5 py-3 text-left ${className}`}
    >
      <input type="radio" name={name} value={value} checked={selected} onChange={() => onClick?.()} disabled={disabled} className="peer sr-only" />
      <span
        className={`flex size-[22px] shrink-0 items-center justify-center rounded-full peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary-normal ${
          selected ? "bg-primary-normal" : "shadow-[inset_0_0_0_1.5px_var(--color-fill-strong)]"
        }`}
      >{selected && <span className="size-2 rounded-full bg-static-white" />}</span>
      <span className="text-body2 text-label-normal">{label}</span>
    </label>
  );
}
