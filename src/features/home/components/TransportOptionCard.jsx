export default function TransportOptionCard({
  icon,
  title,
  description,
  highlight,
  price,
  priceLabel,
  selected = false,
  onClick,
  className = "",
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-16 p-4 text-left ${
        selected
          ? "bg-primary-tint shadow-[inset_0_0_0_1px_var(--color-primary-normal)]"
          : "bg-background-normal shadow-[inset_0_0_0_1px_var(--color-fill-alternative)]"
      } ${className}`}
    >
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-12 ${
          selected ? "bg-primary-normal" : "bg-accent-cyan-surface"
        }`}
      >
        <img src={icon} alt="" className="size-5" />
      </span>
      <div className="flex flex-1 flex-col gap-0.5">
        <p className="text-body1 font-semibold text-label-normal">{title}</p>
        <p className="text-label2 text-label-alternative">{description}</p>
        {highlight && (
          <p className="text-label2 font-semibold text-primary-normal">{highlight}</p>
        )}
      </div>
      <div className="flex flex-col items-end">
        <span className="text-headline2 font-bold text-label-normal">{price}</span>
        <span className="text-caption2 text-label-alternative">{priceLabel}</span>
      </div>
    </button>
  );
}
