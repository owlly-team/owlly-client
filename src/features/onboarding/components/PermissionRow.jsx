import iconLocation from "../../../assets/icons/location.svg";

export default function PermissionRow({
  icon = iconLocation,
  title,
  status,
  description,
  note,
  className = "",
}) {
  return (
    <div className={`grid w-full grid-cols-[40px_1fr] gap-x-3 py-3 ${className}`}>
      <div className="flex size-10 items-center justify-center self-start rounded-12 bg-fill-normal">
        <img src={icon} alt="" className="size-5" />
      </div>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <span className="text-body1 font-semibold text-label-normal">{title}</span>
          {status && (
            <span className="rounded-8 bg-fill-normal px-1.5 py-1 text-caption1 font-medium text-label-neutral">
              {status}
            </span>
          )}
        </div>
        <p className="text-label1 text-label-neutral">{description}</p>
        {note && <p className="text-caption1 text-label-alternative">{note}</p>}
      </div>
    </div>
  );
}
