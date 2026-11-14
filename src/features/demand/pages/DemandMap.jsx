import { useState } from "react";
import useBottomTabNavigation from "../../../shared/hooks/useBottomTabNavigation";
import InfoBox from "../../../shared/components/InfoBox";
import BottomTabBar from "../../../shared/components/BottomTabBar";
import Button from "../../../shared/components/Button";
import DemandFlowMap from "../components/DemandFlowMap";
import RouteRankRow from "../components/RouteRankRow";
import iconStatBars from "../../../assets/icons/stat-bars.svg";
import iconChevronDown from "../../../assets/icons/chevron-down.svg";
import useDemandMap from "../hooks/useDemandMap";
import { DAY_OPTIONS, TIME_OPTIONS } from "../utils/demandMapUtils";

function DemandFilter({ label, value, options, onChange }) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="text-label2 border-line-normal bg-background-normal focus-visible:outline-primary-normal h-9 appearance-none rounded-full border pr-8 pl-3 font-semibold"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <img
        src={iconChevronDown}
        alt=""
        className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2"
      />
    </label>
  );
}

export default function DemandMap() {
  const { activeTab, handleTabChange } = useBottomTabNavigation();
  const [day, setDay] = useState(DAY_OPTIONS[0]);
  const [time, setTime] = useState(TIME_OPTIONS[0]);
  const [selection, setSelection] = useState(null);
  const demand = useDemandMap(day, time);
  const selectedId = demand.routes.some((route) => route.id === selection)
    ? selection
    : (demand.routes.find((route) => route.isMine)?.id ?? demand.routes[0]?.id);
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-4 pt-3 pb-4">
        <h1 className="text-title3 text-label-normal font-bold tracking-tight">
          수요 지도
        </h1>
        <div className="-mt-1 flex gap-2">
          <DemandFilter
            label="요일 선택"
            value={day}
            options={DAY_OPTIONS}
            onChange={setDay}
          />
          <DemandFilter
            label="시간대 선택"
            value={time}
            options={TIME_OPTIONS}
            onChange={setTime}
          />
        </div>
        {demand.loading ? (
          <p role="status" className="text-label2 py-8 text-center">
            수요 정보를 불러오고 있어요.
          </p>
        ) : demand.error ? (
          <div role="alert" className="flex flex-col gap-3 py-4">
            <p>{demand.error.message}</p>
            <Button variant="secondary" onClick={demand.retry}>
              다시 불러오기
            </Button>
          </div>
        ) : (
          <>
            <DemandFlowMap
              routes={demand.routes}
              selectedId={selectedId}
              onSelect={setSelection}
            />
            <InfoBox
              variant="accent"
              icon={iconStatBars}
              title={demand.message.title}
              description={demand.message.description}
            />
            <section
              aria-label="노선 후보 순위"
              className="flex flex-col gap-2"
            >
              {demand.routes.map((route) => (
                <RouteRankRow
                  key={route.id}
                  {...route}
                  selected={route.id === selectedId}
                  onClick={() => setSelection(route.id)}
                />
              ))}
            </section>
            <p className="text-caption2 text-label-alternative">
              등록 5건 미만 구간은 보이지 않아요 · 수요는 AI 추정치
            </p>
          </>
        )}
      </div>
      <footer className="-mx-4 mt-auto pt-4">
        <BottomTabBar activeTab={activeTab} onTabChange={handleTabChange} />
      </footer>
    </div>
  );
}
