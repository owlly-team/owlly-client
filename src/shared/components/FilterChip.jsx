import iconChevronDown from "../../assets/icons/chevron-down.svg";

export default function FilterChip({ label, onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-1 rounded-full px-3 text-label2 font-semibold text-label-normal shadow-[inset_0_0_0_1px_var(--color-fill-strong)] ${className}`}
    >
      {label}
      <img src={iconChevronDown} alt="" className="size-3.5" />
    </button>
  );
}
