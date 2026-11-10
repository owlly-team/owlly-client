import iconChevronRight from "../../../assets/icons/chevron-right.svg";

export default function InfoRow({
  icon,
  title,
  subtitle,
  value,
  chevron = false,
  onClick,
  className = "",
}) {
  const clickable = Boolean(onClick);
  const Comp = clickable ? "button" : "div";

  return (
    <Comp
      type={clickable ? "button" : undefined}
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-3 border-b border-fill-alternative py-3.5 text-left ${className}`}
    >
      <div className="flex items-center gap-3">
        {icon && <img src={icon} alt="" className="size-5 shrink-0" />}
        <div className="flex flex-col gap-0.5">
          <p
            className={
              subtitle
                ? "text-body1 font-semibold text-label-normal"
                : "text-body2 text-label-normal"
            }
          >
            {title}
          </p>
          {subtitle && (
            <p className="text-caption1 text-label-alternative">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {value && <span className="text-label1 text-label-alternative">{value}</span>}
        {chevron && <img src={iconChevronRight} alt="" className="size-5" />}
      </div>
    </Comp>
  );
}
