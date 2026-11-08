import { useState } from "react";
import { useNavigate } from "react-router-dom";
import iconBus from "../../assets/icons/transport-bus.svg";
import iconCarpool from "../../assets/icons/transport-carpool.svg";
import iconTaxi from "../../assets/icons/transport-taxi.svg";
import { getMatchingUiState, toTransportOptionCards } from "./homeUtils";

const TRANSPORT_ICONS = {
  bus: iconBus,
  carpool: iconCarpool,
  taxi: iconTaxi,
};

const TRANSPORT_ROUTES = {
  bus: "/last-train",
  taxi: "/solo-taxi",
};

export default function useHome(data) {
  const navigate = useNavigate();
  // 카드 강조용 선택 상태이며 실제 JourneyChoice를 저장하지 않는다.
  const [selectedTransportId, setSelectedTransportId] = useState("carpool");
  const [selectedTab, setSelectedTab] = useState("home");
  const { travelOptions, matching, matchingDisplay, transportDisplay } = data;
  // 막차 전후와 매칭 전후를 독립적으로 판단하고 화면 표시 여부만 조합한다.
  const transitAvailable = travelOptions?.transit?.available ?? null;
  const matchingUiState = getMatchingUiState(
    matching?.requestStatus ?? null,
    matching?.partyStatus ?? null,
  );
  const isMatchingWaiting = matchingUiState === "MATCHING_WAITING";
  const isMatchingResult = matchingUiState === "MATCHING_RESULT";
  const visibleOptions = toTransportOptionCards(travelOptions, transportDisplay)
    .filter(({ id }) => transitAvailable !== false || id !== "bus");
  const activeTransport = visibleOptions.some(({ id }) => id === selectedTransportId)
    ? selectedTransportId
    : visibleOptions[0]?.id;
  const transportOptions = visibleOptions.map((option) => ({
    ...option,
    icon: option.icon ?? TRANSPORT_ICONS[option.id],
    selected: activeTransport === option.id,
  }));

  function handleTransportSelect(id) {
    setSelectedTransportId(id);
    const route = TRANSPORT_ROUTES[id];
    if (route) navigate(route);
  }

  function handleViewRegistration() {
    navigate("/carpool-registration", {
      state: { selectedTime: matchingDisplay?.departureTime },
    });
  }

  return {
    matchingUiState,
    transitAvailable,
    showTransitAlternative: isMatchingResult && transitAvailable === true,
    showTransportOptions: !isMatchingWaiting && !isMatchingResult,
    transportOptions,
    selectedTab,
    setSelectedTab,
    handleTransportSelect,
    handleViewRegistration,
  };
}
