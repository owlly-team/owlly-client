/**
 * items: { key, label, icon: SVG component, active, onClick }[]
 */
export default function BottomTabBar({ items, className = "" }) {
  return (
    <nav
      className={`flex w-full pb-[env(safe-area-inset-bottom)] bg-background-normal shadow-[0_0_0_1px_var(--color-line-alternative),inset_0_1px_0_0_rgba(112,115,124,0.08)] ${className}`}
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            type="button"
            onClick={item.onClick}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5"
          >
            <Icon
              aria-hidden="true"
              className={`block size-[22px] shrink-0 ${item.active ? "text-primary-normal" : "text-interaction-inactive"}`}
            />
            <span
              className={`text-[11px] leading-[14px] tracking-wide ${
                item.active
                  ? "font-semibold text-primary-normal"
                  : "font-medium text-interaction-inactive"
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
