import MapIcon from "../../../assets/icons/admin-tab-map.svg?react";
import RoutesIcon from "../../../assets/icons/admin-tab-routes.svg?react";
import ReportIcon from "../../../assets/icons/admin-tab-report.svg?react";

const tabs = [
  { key: "map", label: "수요 지도", icon: MapIcon },
  { key: "routes", label: "노선 후보", icon: RoutesIcon },
  { key: "report", label: "리포트", icon: ReportIcon },
];

export default function AdminTabBar({ activeTab, onTabChange, className = "" }) {
  return (
    <nav
      className={`flex w-full pb-[env(safe-area-inset-bottom)] bg-background-normal shadow-[0_0_0_1px_var(--color-line-alternative),inset_0_1px_0_0_rgba(112,115,124,0.08)] ${className}`}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange?.(tab.key)}
            aria-pressed={active}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5"
          >
            <Icon
              aria-hidden="true"
              className={`block size-[22px] shrink-0 ${active ? "text-label-normal" : "text-interaction-inactive"}`}
            />
            <span
              className={`text-[11px] leading-[14px] tracking-wide ${
                active
                  ? "font-semibold text-label-normal"
                  : "font-medium text-interaction-inactive"
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
