import iconChevronRight from "../../../assets/icons/chevron-right-sm.svg";
import iconAlert from "../../../assets/icons/alert-white.svg";
import iconChat from "../../../assets/icons/chat-bubble.svg";

const STATUS_STYLES = {
  waiting: {
    container: "bg-background-normal shadow-[inset_0_0_0_1px_var(--color-fill-alternative)]",
    badge: "bg-fill-normal text-label-neutral",
    title: "text-label-normal",
    desc: "text-label-alternative",
    footer: "text-label-neutral",
  },
  matched: {
    container: "bg-primary-normal",
    badge: "bg-white/18 text-static-white",
    title: "text-static-white",
    desc: "text-static-white/86",
    footer: "text-static-white",
  },
  ongoing: {
    container: "bg-primary-tint shadow-[inset_0_0_0_1px_var(--color-primary-normal)]",
    badge: "bg-primary-tint text-primary-normal",
    title: "text-label-normal",
    desc: "text-label-alternative",
    footer: "text-primary-normal",
  },
};

export default function HomeShareCard({
  status = "waiting",
  statusLabel,
  trailingBadge,
  title,
  description,
  code,
  footerLabel,
  footerIcon,
  onClick,
  className = "",
}) {
  const s = STATUS_STYLES[status];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full flex-col gap-1 rounded-16 p-4 text-left ${s.container} ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className={`rounded-8 px-1.5 py-1 text-caption1 font-medium ${s.badge}`}>
          {statusLabel}
        </span>
        {trailingBadge && (
          <span className="rounded-full bg-white px-2 py-0.5 text-caption1 font-semibold text-primary-normal">
            {trailingBadge}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <p className={`text-heading2 font-bold tracking-tight ${s.title}`}>{title}</p>
          <p className={`text-label2 ${s.desc}`}>{description}</p>
        </div>
        {code && (
          <div className="flex flex-col items-end">
            <span className={`text-caption2 ${s.desc}`}>확인 코드</span>
            <span className="text-title3 font-bold tracking-widest text-primary-normal">
              {code}
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-end gap-0.5 pt-1">
        <span className={`text-label1 font-semibold ${s.footer}`}>{footerLabel}</span>
        <img src={footerIcon ?? (status === "matched" ? iconAlert : status === "ongoing" ? iconChat : iconChevronRight)} alt="" className="size-4" />
      </div>
    </button>
  );
}
