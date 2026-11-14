import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useBottomTabNavigation from "../../../shared/hooks/useBottomTabNavigation";
import useSessionStore from "../../../shared/stores/sessionStore";
import iconBus from "../../../assets/icons/transport-bus.svg";
import iconCarpool from "../../../assets/icons/transport-carpool.svg";
import iconTaxi from "../../../assets/icons/transport-taxi.svg";
import {
  getMatchingUiState,
  toTransportOptionCards,
  toHomeViewData,
} from "../utils/homeUtils";

const TRANSPORT_ICONS = {
  bus: iconBus,
  carpool: iconCarpool,
  taxi: iconTaxi,
};

const TRANSPORT_ROUTES = {
  bus: "/train",
  taxi: "/solo-taxi",
};

export default function useHome(data, { onPendingFeature } = {}) {
  const navigate = useNavigate();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (
      (!data.matchedAt &&
        !data.party?.confirmDeadlineAt &&
        !data.party?.departureAt) ||
      (data.isPreview === true && Number.isFinite(Date.parse(data.previewNow)))
    )
      return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [
    data.matchedAt,
    data.party?.confirmDeadlineAt,
    data.party?.departureAt,
    data.previewNow,
    data.isPreview,
  ]);

  const { travelOptions, rideRequest, party } = data;
  const displayNow = getDisplayNow(data, now);
  const viewData = toHomeViewData(data, displayNow);
  const { transportDisplay } = viewData;

  // 막차 전후와 매칭 전후를 독립적으로 판단하고 화면 표시 여부만 조합
  const transitAvailable = travelOptions?.transit?.available ?? null;
  const matchingUiState = getMatchingUiState(
    rideRequest?.status ?? null,
    rideRequest?.status === "MATCHED" && party?.id === rideRequest.partyId
      ? (party?.status ?? null)
      : null,
  );
  const isMatchingWaiting = matchingUiState === "MATCHING_WAITING";
  const isMatchingResult = matchingUiState === "MATCHING_RESULT";
  const isRideInProgress = matchingUiState === "RIDE_IN_PROGRESS";
  //막차 끊기면 버스 카드 제외
  const visibleOptions = toTransportOptionCards(
    travelOptions ?? (data.isPreview === false ? {} : null),
    transportDisplay,
  ).filter(({ id }) => transitAvailable !== false || id !== "bus");
  const transportOptions = visibleOptions.map((option) => ({
    ...option,
    icon: option.icon ?? TRANSPORT_ICONS[option.id],
    selected: option.id === "carpool",
    ...(!travelOptions && data.isPreview === false
      ? { description: "출발 위치를 확인해 주세요" }
      : {}),
  }));

  //귀가 방법 카드 눌렀을 때 처리
  function handleTransportSelect(id) {
    if (id === "bus") {
      navigate("/train", {
        state: {
          isPreview: data.isPreview !== false,
          userId: useSessionStore.getState().user?.id,
          travelContext: {
            pickupPoint: data.pickupPoint,
            dropoff: data.profile?.defaultDropoff,
            travelOptions,
            journey: data.journey,
            sameGenderDefault: data.profile?.sameGenderDefault,
          },
        },
      });
      return;
    }
    if (data.isPreview === false) return onPendingFeature?.();
    if (id === "carpool") {
      handleStartRegistration();
      return;
    }
    if (data.isPreview === false) return onPendingFeature?.();
    const route = TRANSPORT_ROUTES[id];
    if (route) navigate(`${route}?preview=${id === "bus" ? "train" : "taxi"}`);
  }
  //출발 거점과 하차 위치 선택
  function handleStartRegistration() {
    const profile = data.profile;
    const destinationId =
      travelOptions?.destinationDongId ?? profile?.defaultDongId;
    navigate("/pickup", {
      state: {
        isPreview: data.isPreview !== false,
        pickupPoint: data.pickupPoint,
        universityId:
          profile?.user?.universityId ?? travelOptions?.universityId,
        universityName:
          profile?.user?.universityName ?? travelOptions?.universityName,
        //응답의 동 ID·이름과 프로필 기본 좌표로 첫 하차 위치 표시
        defaultDestination: destinationId
          ? {
              id: destinationId,
              name:
                travelOptions?.destinationDongName ?? profile?.defaultDongName,
              districtId: travelOptions?.districtId,
              districtName: travelOptions?.districtName,
              point: data.profile?.defaultDropoff,
            }
          : null,
        sameGenderDefault: data.profile?.sameGenderDefault ?? true,
      },
    });
  }

  const { activeTab: selectedTab, handleTabChange } = useBottomTabNavigation({
    onReturn: handleStartRegistration,
  });

  //동승 등록 내용 보기
  function handleViewRegistration() {
    navigate("/carpool-registration", {
      state: {
        rideRequest,
        isPreview: data.isPreview !== false,
        matchingSlot: data.matchingSlots?.find(
          (slot) => slot.departureAt === rideRequest?.departureAt,
        ),
      },
    });
  }

  //MATCHED 신청의 partyId로 매칭 결과 화면 이동
  function handleViewMatchingResult(partyId) {
    const demoResult =
      data.isPreview === true
        ? useDemoStore.getState().session?.matchingResult
        : null;
    const myDecision = demoResult?.party.members.find(
      (member) => member.memberId === demoResult.party.myMemberId,
    )?.decision;
    if (
      demoResult?.party.id === partyId &&
      myDecision === "ACCEPTED" &&
      (demoResult.party.myMemberId !==
        demoResult.party.representativeMemberId ||
        useDemoStore.getState().session.account)
    ) {
      navigate(`/rooms/${demoResult.party.roomId}`, {
        state: { isPreview: true },
      });
      return;
    }
    navigate(`/matching/result/${partyId}`, {
      state: {
        isPreview: data.isPreview !== false,
        matchingContext: { rideRequest, travelOptions },
      },
    });
  }

  function handleViewFailure() {
    if (!rideRequest?.id) return;
    navigate(
      `/matching/failed?requestId=${encodeURIComponent(rideRequest.id)}`,
    );
  }

  function handleOpenRoom(room) {
    if (!party?.id || rideRequest?.partyId !== party.id) return;
    const roomId =
      room?.partyId === party.id && (!party.roomId || room.id === party.roomId)
        ? room.id
        : party.roomId;
    navigate(roomId ? `/rooms/${roomId}` : `/parties/${party.id}/room`, {
      state: {
        isPreview: data.isPreview === true,
        matchingResult: { party, rideRequest, settlement: data.settlement },
        ...(room?.partyId === party.id && room.id === roomId ? { room } : {}),
      },
    });
  }

  return {
    viewData,
    matchingUiState,
    isRideInProgress,
    displayNow,
    transitAvailable,
    showTransitAlternative: isMatchingResult && transitAvailable === true,
    showTransportOptions:
      !isMatchingWaiting && !isMatchingResult && !isRideInProgress,
    transportOptions,
    selectedTab,
    handleTabChange,
    handleTransportSelect,
    handleViewRegistration,
    handleViewMatchingResult,
    handleViewFailure,
    handleOpenRoom,
  };
}
