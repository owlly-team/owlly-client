export default function TimeChip({
  time,
  subLabel,
  selected = false,
  disabled = false,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`rounded-12 flex min-w-[76px] flex-col items-center justify-center gap-0.5 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40 ${
        selected
          ? "bg-label-normal text-static-white"
          : "text-label-normal shadow-[inset_0_0_0_1px_var(--color-fill-strong)]"
      }`}
    >
      <span className="text-body1 font-semibold">{time}</span>
      <span
        className={`text-caption1 ${selected ? "text-static-white" : "text-label-neutral"}`}
      >
        {subLabel}
      </span>
    </button>
  );
}
