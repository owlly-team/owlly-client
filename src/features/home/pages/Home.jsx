import { useState } from "react";
import { useNavigate } from "react-router-dom";
import LastDepartureCard from "../components/LastDepartureCard";
import TransportOptionCard from "../components/TransportOptionCard";
import iconLocation from "../../../assets/icons/location.svg";
import HomeIcon from "../../../assets/icons/nav-home.svg?react";
import iconBus from "../../../assets/icons/transport-bus.svg";
import iconCarpool from "../../../assets/icons/transport-carpool.svg";
import iconTaxi from "../../../assets/icons/transport-taxi.svg";
import BottomTabBar from "../../../shared/components/BottomTabBar";
import Badge from "../../../shared/components/Badge";
import iconChevronRight from "../../../assets/icons/chevron-right-sm.svg";

const TRANSPORT_ICONS = {
  bus: iconBus,
  carpool: iconCarpool,
  taxi: iconTaxi,
};

const TRANSPORT_ROUTES = {
  bus: "/last-train",
  taxi: "/solo-taxi",
};

// 홈 입력용 목업이며 API 응답 스키마 자체가 아님.
// API 연동 시 PickupPoint.name을 pickupPoint.name에 연결하고,
// destinationLabel에는 별도로 조회한 지역명을 전달한다.
// TravelOptions.destinationDongId / StudentProfile.defaultDongId는 ID이고,
// StudentProfile.defaultDropoff는 좌표이므로 지역명으로 임의 변환하지 않는다.
const defaultHomeData = {
  pickupPoint: { name: "단국대 정문 근처" },
  destinationLabel: "영통2동",
  // POST /travel-options 응답의 data. 아래 날짜/ID/금액은 목업 값.
  travelOptions: {
    transit: {
      available: true,
      lastLeaveAt: "2026-11-08T22:49:00+09:00",
      arrivalAt: "2026-11-08T23:41:00+09:00",
      estimatedCostWon: 1550,
      legs: [],
      sourceLabel: "목업 추정값",
      asOf: "2026-11-08T22:00:00+09:00",
    },
    soloTaxiEstimatedWon: 27400,
    poolEstimatedShareWon: 7900,
    estimatedArrivalAt: "2026-11-08T23:40:00+09:00",
    destinationDongId: "31",
    districtId: "21",
    asOf: "2026-11-08T22:00:00+09:00",
    warnings: [],
  },
  // 카드 표시용 데이터. time은 교통수단 출발 시각으로 lastLeaveAt과 다름.
  // API 연동 시 lastLeaveAt의 표시/마감 판단을 연결하며 매칭과는 독립적으로 처리.
  lastTransit: {
    time: "22:58",
    place: "정문 정류장 · 도보 4분",
    note: "22:49까지 출발해야 해요",
  },
  matching: {
    requestStatus: "MATCHED", // 매칭 결과 화면 목업. 신청이 없으면 null
    partyStatus: "CONFIRMING", // Party.status 원본 값, 팟이 없으면 null
  },
  // 화면 표시용 목업. API 연동 시 신청 출발 시각, 거점명,
  // 별도로 확인한 구 이름과 MatchingSlot.waitingCount로 구성한다.
  matchingDisplay: {
    departureTime: "23:30",
    pickupPointName: "단국대 정문",
    directionLabel: "영통구",
    waitingCount: 2,
    // 결과 카드 표시용 목업. 인원은 Party.members, 금액은 본인
    // SettlementItem.estimatedShareWon을 연결한다. 확정 기한은 정책/필드 확인 필요.
    matchedCompanionCount: 3,
    estimatedShareWon: 7900,
    confirmationTimeLabel: "22:49",
    remainingTimeLabel: "5분 남음", // 실제 타이머나 확정된 서버 TTL이 아님
  },
  // 기존 화면을 유지하기 위한 표시용 목업(API 필드명 아님).
  // 연동 시 경로/예상 시각과 matching-slots의 대기 수 등으로 표시 문구를 구성한다.
  transportDisplay: {
    bus: {
      iconTone: "cyan",
      title: "막차",
      description: "22:58 출발 · 23:41 도착",
      priceLabel: "1인",
    },
    carpool: {
      iconTone: "primary",
      title: "동승",
      description: "00:00 출발 · 00:30 도착",
      highlight: "영통구 방향 1명 대기",
      priceLabel: "예상 1인 부담",
    },
    taxi: {
      iconTone: "neutral",
      title: "혼자 택시",
      description: "지금 출발 · 23:40 도착",
      priceLabel: "1인",
    },
  },
};

function formatWon(amount, approximate = false) {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return "금액 미정";
  return `${approximate ? "약 " : ""}${amount.toLocaleString("ko-KR")}원`;
}

// TravelOptions 원본 금액을 기존 카드 props 배열로 변환한다.
// bus/carpool/taxi는 UI 식별자이며 JourneyChoice.mode(BUS/SOLO)가 아니다.
function toTransportOptionCards(travelOptions, display = {}) {
  if (!travelOptions) return [];
  return [
    ["bus", travelOptions.transit?.estimatedCostWon, false],
    ["carpool", travelOptions.poolEstimatedShareWon, true],
    ["taxi", travelOptions.soloTaxiEstimatedWon, false],
  ].map(([id, amount, approximate]) => ({
    ...display[id],
    id,
    price: formatWon(amount, approximate),
  }));
}

// 홈 표시 전용 파생 값. 백엔드 상태에 저장하거나 API로 전달하지 않음
// null은 일반 홈을 의미하며, 팟이 있으면 신청 상태보다 우선해서 판단
function getMatchingUiState(requestStatus, partyStatus) {
  if (partyStatus != null) {
    switch (partyStatus) {
      case "CONFIRMING":
        return requestStatus === "MATCHED" ? "MATCHING_RESULT" : null;
      case "PREPAYING":
      case "READY":
      case "RIDING":
      case "SETTLING":
        return "RIDE_IN_PROGRESS";
      default:
        // FORMING, COMPLETED, CANCELLED 등 정책 미확정 상태는 일반 홈
        return null;
    }
  }

  // FAILED, CANCELLED, EXPIRED 및 신청 없음은 일반 홈
  return requestStatus === "WAITING" ? "MATCHING_WAITING" : null;
}

// 백엔드 상태와 분리된 홈 UI 분기. 동승 진행 화면은 추후 구현.
function renderMatchingSection(uiState, display, onViewRegistration, onViewMatchingResult) {
  switch (uiState) {
    case "MATCHING_WAITING":
      return (
        <section
          aria-labelledby="matching-waiting-title"
          className="rounded-16 border-line-normal bg-background-normal mt-5 border p-4"
        >
          <Badge variant="neutral">매칭 대기 중</Badge>
          <h2
            id="matching-waiting-title"
            className="text-heading2 text-label-strong mt-2 font-bold"
          >
            {display?.departureTime} {display?.pickupPointName} 출발
          </h2>
          <p className="text-label2 text-label-neutral mt-1">
            {display?.directionLabel && `${display.directionLabel} 방향 · `}
            {display?.waitingCount != null && `지금 ${display.waitingCount}명 대기 · `}
            결과는 막차 전에 알려 드려요
          </p>
          <div className="border-line-alternative mt-3 border-t pt-2">
            <button
              type="button"
              onClick={onViewRegistration}
              className="font-semibold text-label1 text-label-neutral focus-visible:outline-primary-normal ml-auto flex min-h-7 items-center gap-1 rounded-8 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              등록 내용 보기
              <img src={iconChevronRight} alt="" className="size-4" />
            </button>
          </div>
        </section>
      );
    case "MATCHING_RESULT":
      return (
        <section
          aria-labelledby="matching-result-title"
          className="rounded-16 bg-primary-normal text-static-white mt-5 p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption1 rounded-8 bg-white/20 px-2 py-1 font-semibold">
              매칭됐어요
            </span>
            {display?.remainingTimeLabel && (
              <span className="text-caption1 bg-static-white text-primary-normal rounded-full px-2 py-1 font-semibold">
                {display.remainingTimeLabel}
              </span>
            )}
          </div>
          <h2 id="matching-result-title" className="text-heading2 mt-2 font-bold">
            {display?.matchedCompanionCount != null
              ? `같은 학교 ${display.matchedCompanionCount}명과 매칭됐어요`
              : "같은 학교 동승자와 매칭됐어요"}
          </h2>
          <p className="text-label2 mt-1">
            {display?.departureTime} {display?.pickupPointName} 출발 · 예상 1인{" "}
            {formatWon(display?.estimatedShareWon)}
          </p>
          <div className="mt-3 border-t border-white/20 pt-2">
            <button
              type="button"
              onClick={onViewMatchingResult}
              disabled={!onViewMatchingResult}
              title={!onViewMatchingResult ? "팟 확정 화면 연결 예정" : undefined}
              className="text-label1 ml-auto flex min-h-7 items-center gap-1 rounded-8 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed"
            >
              {display?.confirmationTimeLabel
                ? `${display.confirmationTimeLabel}까지 확정해 주세요`
                : "매칭 결과 확인하기"}
              <img src={iconChevronRight} alt="" className="size-4 brightness-0 invert" />
            </button>
          </div>
        </section>
      );
    case "RIDE_IN_PROGRESS":
      return null;
    default:
      return null;
  }
}

export default function Home({ data = defaultHomeData, onViewMatchingResult }) {
  const navigate = useNavigate();
  const [selectedTransportId, setSelectedTransportId] = useState("carpool");
  const [selectedTab, setSelectedTab] = useState("home");
  const {
    pickupPoint,
    destinationLabel,
    travelOptions,
    lastTransit,
    matching,
    matchingDisplay,
    transportDisplay,
  } = data;

  const transit = travelOptions?.transit;
  const isLastTransitEnded = transit?.available === false;
  const matchingUiState = getMatchingUiState(
    matching?.requestStatus ?? null,
    matching?.partyStatus ?? null,
  );
  const isMatchingWaiting = matchingUiState === "MATCHING_WAITING";
  const isMatchingResult = matchingUiState === "MATCHING_RESULT";
  const visibleTransportOptions = toTransportOptionCards(
    travelOptions,
    transportDisplay,
  ).filter(({ id }) => !isLastTransitEnded || id !== "bus");
  const activeTransport = visibleTransportOptions.some(
    ({ id }) => id === selectedTransportId,
  )
    ? selectedTransportId
    : visibleTransportOptions[0]?.id;

  function handleTransportSelect(id) {
    setSelectedTransportId(id);
    const route = TRANSPORT_ROUTES[id];
    if (route) navigate(route);
  }

  return (
    <div className="flex w-full flex-1 flex-col pt-1.5">
      <header className="text-label2 text-label-neutral flex min-h-5.5 items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-1.5">
          <img src={iconLocation} className="size-4 shrink-0" />
          {pickupPoint?.name}
        </p>
        <p className="flex min-w-0 items-center gap-1.5">
          <HomeIcon
            aria-hidden="true"
            className="text-label-alternative size-4 shrink-0"
          />
          {destinationLabel}
        </p>
      </header>
      {renderMatchingSection(
        matchingUiState,
        matchingDisplay,
        () => navigate("/carpool-registration", {
          state: { selectedTime: matchingDisplay?.departureTime },
        }),
        onViewMatchingResult,
      )}
      <div className="mt-5">
        {lastTransit && (
          <LastDepartureCard
            {...lastTransit}
            available={transit?.available ?? null}
          />
        )}
      </div>
      {isMatchingResult && transit?.available === true && (
        <p className="text-caption1 text-label-alternative mt-5">
          확정하지 않으면 막차를 타도 돼요.
        </p>
      )}
      {!isMatchingWaiting && !isMatchingResult && (
        <div className="mt-5 flex flex-col gap-2">
          <h2 className="text-heading2 mb-1.4 font-bold">귀가 방법 비교</h2>
          {visibleTransportOptions.map(({ id, ...option }) => (
            <TransportOptionCard
              key={id}
              {...option}
              icon={option.icon ?? TRANSPORT_ICONS[id]}
              selected={activeTransport === id}
              onClick={() => handleTransportSelect(id)}
            />
          ))}
        </div>
      )}
      <footer className="bg-background-normal -mx-4 mt-auto">
        <BottomTabBar activeTab={selectedTab} onTabChange={setSelectedTab} />
      </footer>
    </div>
  );
}
