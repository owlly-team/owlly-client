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
    requestStatus: null, // RideRequest.status 원본 값, 신청이 없으면 null
    partyStatus: null, // Party.status 원본 값, 팟이 없으면 null
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

// 매칭 UI는 이 분기에 추가. 아직은 모든 상태에서 기존 홈을 유지
function renderMatchingSection(uiState) {
  switch (uiState) {
    case "MATCHING_WAITING":
      return null;
    case "MATCHING_RESULT":
      return null;
    case "RIDE_IN_PROGRESS":
      return null;
    default:
      return null;
  }
}

export default function Home({ data = defaultHomeData }) {
  const navigate = useNavigate();
  const [selectedTransportId, setSelectedTransportId] = useState("carpool");
  const [selectedTab, setSelectedTab] = useState("home");
  const {
    pickupPoint,
    destinationLabel,
    travelOptions,
    lastTransit,
    matching,
    transportDisplay,
  } = data;

  const transit = travelOptions?.transit;
  const isLastTransitEnded = transit?.available === false;
  const matchingUiState = getMatchingUiState(
    matching?.requestStatus ?? null,
    matching?.partyStatus ?? null,
  );
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
      {renderMatchingSection(matchingUiState)}
      <div className="mt-5">
        {lastTransit && (
          <LastDepartureCard
            {...lastTransit}
            available={transit?.available ?? null}
          />
        )}
      </div>
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
      <footer className="bg-background-normal -mx-4 mt-auto">
        <BottomTabBar activeTab={selectedTab} onTabChange={setSelectedTab} />
      </footer>
    </div>
  );
}
