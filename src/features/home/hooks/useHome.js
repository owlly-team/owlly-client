import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import iconBus from "../../../assets/icons/transport-bus.svg";
import iconCarpool from "../../../assets/icons/transport-carpool.svg";
import iconTaxi from "../../../assets/icons/transport-taxi.svg";
import { getMatchingUiState, toTransportOptionCards, toHomeViewData } from "../utils/homeUtils";

const TRANSPORT_ICONS = {
  bus: iconBus,
  carpool: iconCarpool,
  taxi: iconTaxi,
};

const TRANSPORT_ROUTES = {
  bus: "/train",
  taxi: "/solo-taxi",
};

export default function useHome(data) {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState("home");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!data.matchedAt || data.previewNow) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [data.matchedAt, data.previewNow]);

  const { travelOptions, rideRequest, party } = data;
  const viewData = toHomeViewData(data, data.previewNow ? Date.parse(data.previewNow) : now);
  const { transportDisplay } = viewData;

  // 막차 전후와 매칭 전후를 독립적으로 판단하고 화면 표시 여부만 조합
  const transitAvailable = travelOptions?.transit?.available ?? null;
  const matchingUiState = getMatchingUiState(
    rideRequest?.status ?? null,
    rideRequest?.status === "MATCHED" && party?.id === rideRequest.partyId ? party?.status ?? null : null,
  );
  const isMatchingWaiting = matchingUiState === "MATCHING_WAITING";
  const isMatchingResult = matchingUiState === "MATCHING_RESULT";
  //막차 끊기면 버스 카드 제외
  const visibleOptions = toTransportOptionCards(travelOptions, transportDisplay)
    .filter(({ id }) => transitAvailable !== false || id !== "bus");
  const transportOptions = visibleOptions.map((option) => ({
    ...option,
    icon: option.icon ?? TRANSPORT_ICONS[option.id],
    selected: option.id === "carpool",
  }));

  //귀가 방법 카드 눌렀을 때 처리
  function handleTransportSelect(id) {
    if (id === "carpool") {
      handleStartRegistration();
      return;
    }
    const route = TRANSPORT_ROUTES[id];
    if (route) navigate(route);
  }
  //출발 거점과 하차 위치 선택
  function handleStartRegistration() {
    navigate("/pickup", {
      state: {
        pickupPoint: data.pickupPoint,
        universityId: travelOptions?.universityId,
        universityName: travelOptions?.universityName,
        //응답의 동 ID·이름과 프로필 기본 좌표로 첫 하차 위치 표시
        defaultDestination: travelOptions?.destinationDongId ? {
          id: travelOptions.destinationDongId,
          name: travelOptions.destinationDongName,
          districtId: travelOptions.districtId,
          districtName: travelOptions.districtName,
          point: data.profile?.defaultDropoff,
        } : null,
        sameGenderDefault: data.profile?.sameGenderDefault ?? true,
      },
    });
  }

  function handleTabChange(tab) {
    if (tab === "return") {
      handleStartRegistration();
      return;
    }
    setSelectedTab(tab);
  }

  //동승 등록 내용 보기
  function handleViewRegistration() {
    navigate("/carpool-registration", {
      state: {
        rideRequest,
        matchingSlot: data.matchingSlots?.find((slot) => slot.departureAt === rideRequest?.departureAt),
      },
    });
  }

  //MATCHED 신청의 partyId로 매칭 결과 화면 이동
  function handleViewMatchingResult(partyId) {
    navigate(`/matching/result/${partyId}`, {
      state: { matchingContext: { rideRequest, travelOptions } },
    });
  }

  return {
    viewData,
    matchingUiState,
    transitAvailable,
    showTransitAlternative: isMatchingResult && transitAvailable === true,
    showTransportOptions: !isMatchingWaiting && !isMatchingResult,
    transportOptions,
    selectedTab,
    handleTabChange,
    handleTransportSelect,
    handleViewRegistration,
    handleViewMatchingResult,
  };
}
