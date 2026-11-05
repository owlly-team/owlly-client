import iconDest from "../../assets/icons/dest-pin.svg";
import iconChevronRight from "../../assets/icons/chevron-right.svg";

export default function PlaceRow({ icon = iconDest, title, subtitle, onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-12 px-4 py-2 text-left ${className}`}
    >
      <img src={icon} alt="" className="size-5 shrink-0" />
      <div className="flex flex-1 flex-col gap-0.5">
        <p className="text-body1 font-semibold text-label-normal">{title}</p>
        <p className="text-label2 text-label-neutral">{subtitle}</p>
      </div>
      <img src={iconChevronRight} alt="" className="size-5 shrink-0" />
    </button>
  );
}
