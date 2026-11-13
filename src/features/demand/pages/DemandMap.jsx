import { useState } from "react";
import useBottomTabNavigation from "../../../shared/hooks/useBottomTabNavigation";
import FilterChip from "../../../shared/components/FilterChip";
import InfoBox from "../../../shared/components/InfoBox";
import BottomTabBar from "../../../shared/components/BottomTabBar";
import MapPlaceholder from "../components/MapPlaceholder";
import RouteRankRow from "../components/RouteRankRow";
import iconStatBars from "../../../assets/icons/stat-bars.svg";

const DAY_OPTIONS = ["금요일", "토요일", "일요일", "월요일", "화요일", "수요일", "목요일"];
const TIME_OPTIONS = ["23~01시", "21~23시", "00~02시"];

const MOCK_DATA = {
  isCandidate: {
    day: "금요일",
    time: "23~01시",
    myRoute: "단국대 정문 → 영통구",
    message: {
      title: "내 구간이 노선 후보 3위예요",
      description: "단국대 정문 → 영통구 · 내 귀가 4회 반영. 학교와 용인시에 제안 중이에요.",
    },
    routes: [
      { rank: 1, title: "단국대 정문 → 처인구", subtitle: "금 23~01시", demand: "주 142회", progress: 72 },
      { rank: 3, title: "단국대 정문 → 영통구", subtitle: "내 귀가 4회 반영", demand: "주 88회", progress: 45 },
    ],
    footnote: "등록 5건 미만 구간은 보이지 않아요 · 수요는 AI 추정치",
  },
  notCandidate: {
    day: "화요일",
    time: "23~01시",
    myRoute: "강남역 → 처인구",
    message: {
      title: "강남역 → 처인구는 아직 후보가 아니에요",
      description: "후보까지 주 23회 남았어요. 내 귀가 3회가 반영됐어요.",
    },
    routes: [
      { rank: "–", title: "강남역 → 처인구", subtitle: "후보까지 주 23회 남음", demand: "주 61회", progress: 32 },
    ],
    footnote: "막차 선택, 혼자 택시, 매칭 실패도 모두 수요로 기록돼요",
  },
};

export default function DemandMap() {
  const { activeTab, handleTabChange } = useBottomTabNavigation();
  const [isCandidate, setIsCandidate] = useState(true);
  const [day, setDay] = useState(DAY_OPTIONS[0]);
  const [time, setTime] = useState(TIME_OPTIONS[0]);

  const data = isCandidate ? MOCK_DATA.isCandidate : MOCK_DATA.notCandidate;

  const cycle = (list, current, setter) => () => {
    const next = list[(list.indexOf(current) + 1) % list.length];
    setter(next);
  };

  return (
    <div className="flex flex-1 flex-col justify-between">
      <div className="flex flex-col gap-4 pt-3">
        <div className="flex items-center justify-between">
          <h1 className="text-title3 font-bold tracking-tight text-label-normal">
            수요 지도
          </h1>
          {/* QA 전용: 디자인엔 없는 상태 전환 버튼 — 두 상태를 눈으로 바로 확인하기 위한 목업 토글 */}
          <button
            type="button"
            onClick={() => setIsCandidate((value) => !value)}
            className="text-caption1 text-label-alternative underline"
          >
            QA: {isCandidate ? "후보 아님 보기" : "후보 보기"}
          </button>
        </div>

        <div className="flex gap-2">
          <FilterChip label={day} onClick={cycle(DAY_OPTIONS, day, setDay)} />
          <FilterChip label={time} onClick={cycle(TIME_OPTIONS, time, setTime)} />
        </div>

        <MapPlaceholder
          legend={["심야 귀가 흐름 · 굵을수록 많음", "내 귀가가 반영된 구간"]}
        />

        <InfoBox
          variant="normal"
          icon={iconStatBars}
          title={data.message.title}
          description={data.message.description}
        />

        <div className="flex flex-col gap-2">
          {data.routes.map((route) => (
            <RouteRankRow key={route.title} {...route} />
          ))}
        </div>

        <p className="text-caption1 text-label-alternative">{data.footnote}</p>
      </div>

      <div className="-mx-4 pt-4">
        <BottomTabBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </div>
    </div>
  );
}
