//막차, 동승, 혼자택시
export default function TransportOptionCard({
  icon,
  title,
  description,
  highlight,
  price,
  priceLabel,
  selected = false,
  iconTone = selected ? "primary" : "cyan",
  onClick,
  className = "",
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-16 flex w-full items-center gap-3 px-4 py-3 text-left ${
        selected
          ? "bg-primary-tint shadow-[inset_0_0_0_1px_var(--color-primary-normal)]"
          : "bg-background-normal shadow-[inset_0_0_0_1px_var(--color-fill-alternative)]"
      } ${className}`}
    >
      <span
        className={`rounded-12 flex size-10 shrink-0 items-center justify-center ${
          iconTone === "primary"
            ? "bg-primary-normal"
            : iconTone === "neutral"
              ? "bg-fill-normal"
              : "bg-accent-cyan-surface"
        }`}
      >
        <img src={icon} alt="" className="size-5" />
      </span>
      <div className="flex flex-1 flex-col gap-0.5">
        <p className="text-body1 text-label-normal font-semibold">{title}</p>
        <p className="text-label2 text-label-neutral">{description}</p>
        {highlight && (
          <p className="text-label2 text-primary-normal font-semibold">
            {highlight}
          </p>
        )}
      </div>
      <div className="flex flex-col items-end">
        <span className="text-headline2 text-label-normal font-bold">
          {price}
        </span>
        <span className="text-caption2 text-label-alternative">
          {priceLabel}
        </span>
      </div>
    </button>
  );
}
