import HomeIcon from "../../assets/icons/nav-home.svg?react";
import ReturnIcon from "../../assets/icons/nav-return.svg?react";
import MapIcon from "../../assets/icons/nav-map.svg?react";
import ProfileIcon from "../../assets/icons/nav-profile.svg?react";

const tabs = [
  { key: "home", label: "홈", icon: HomeIcon },
  { key: "return", label: "귀가", icon: ReturnIcon },
  { key: "map", label: "수요 지도", icon: MapIcon },
  { key: "profile", label: "내 정보", icon: ProfileIcon },
];

export default function BottomTabBar({ activeTab, onTabChange, className = "" }) {
  return (
    <nav
      className={`flex w-full pb-[env(safe-area-inset-bottom)] bg-background-normal shadow-[0_0_0_1px_var(--color-line-alternative),inset_0_1px_0_0_rgba(112,115,124,0.08)] ${className}`}
    >
      {tabs.map((item) => {
        const Icon = item.icon;
        const active = activeTab === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onTabChange?.(item.key)}
            aria-pressed={active}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5"
          >
            <Icon
              aria-hidden="true"
              className={`block size-[22px] shrink-0 ${active ? "text-primary-normal" : "text-interaction-inactive"}`}
            />
            <span
              className={`text-[11px] leading-[14px] tracking-wide ${
                active
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
