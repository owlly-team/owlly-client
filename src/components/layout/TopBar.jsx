import IconButton from "../ui/IconButton";
import iconChevronLeft from "../../assets/icons/chevron-left.svg";
import iconClose from "../../assets/icons/close.svg";

const LEFT_ICON = {
  back: { src: iconChevronLeft, alt: "뒤로" },
  close: { src: iconClose, alt: "닫기" },
};

export default function TopBar({
  leftAction = "back",
  onLeftClick,
  title,
  rightSlot,
  className = "",
}) {
  const left = LEFT_ICON[leftAction];

  return (
    <div
      className={`flex min-h-14 w-full items-center gap-1 rounded-12 bg-background-normal px-2 shadow-[0_0_0_1px_var(--color-line-alternative)] ${className}`}
    >
      <IconButton src={left.src} alt={left.alt} onClick={onLeftClick} />
      <p className="flex-1 truncate text-headline2 font-semibold text-label-normal">
        {title}
      </p>
      {rightSlot}
    </div>
  );
}
