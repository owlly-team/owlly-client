//서버 데이터를 화면용 값으로 변환

export function formatWon(amount, approximate = false) {
  if (typeof amount !== "number" || !Number.isFinite(amount))
    return "금액 미정";
  return `${approximate ? "약 " : ""}${amount.toLocaleString("ko-KR")}원`;
}

export function toTransportOptionCards(travelOptions, display = {}) {
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

// requestStaus: 동승신청상태, partyStatus:팟상태(확정유무)
// null은 일반 홈을 의미하며, 팟이 있으면 신청 상태보다 우선해서 판단
export function getMatchingUiState(requestStatus, partyStatus) {
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

  if (requestStatus === "FAILED") return "MATCHING_FAILED";
  // CANCELLED, EXPIRED 및 신청 없음은 일반 홈
  if (requestStatus === "MATCHED") return "MATCHING_RESULT";
  return requestStatus === "WAITING" ? "MATCHING_WAITING" : null;
}

export function formatTime(value) {
  if (!value || Number.isNaN(new Date(value).getTime())) return "시간 미정";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value)); //문자열-> 날짜객체
}

export function toHomeViewData(data, now = Date.now()) {
  const {
    travelOptions,
    rideRequest,
    matchingSlots = [],
    presentation = {},
  } = data;
  // 이전 신청의 팟 정보가 남아 있어도 현재 신청 결과와 섞지 않는다.
  const party =
    rideRequest?.status === "MATCHED" && data.party?.id === rideRequest.partyId
      ? data.party
      : null;
  const transit = travelOptions?.transit;
  const legs = transit?.legs ?? [];
  const firstRide = legs.find(
    (leg) => leg.mode === "BUS" || leg.mode === "SUBWAY",
  );
  const walk = legs[0]?.mode === "WALK" ? legs[0] : null;
  const walkMinutes = walk //처음 걷는 구간 시간 계산
    ? Math.round(
        (new Date(walk.arrivalAt) - new Date(walk.departureAt)) / 60000,
      )
    : null;

  //동승 출발 시간 선택
  const isActiveRequest = ["WAITING", "MATCHED"].includes(rideRequest?.status);
  const slot = isActiveRequest
    ? matchingSlots.find((item) => item.departureAt === rideRequest.departureAt)
    : matchingSlots.find((item) => item.registrationAllowed);
  const departureAt =
    party?.departureAt ??
    (isActiveRequest ? rideRequest.departureAt : slot?.departureAt);
  const waitingCount = slot?.waitingCount;
  const pickupPointName =
    party?.pickupPoint?.name ??
    (isActiveRequest
      ? rideRequest.pickupPointName
      : travelOptions?.pickupPointName) ??
    data.pickupPoint?.name;
  const direction = presentation.directionLabel;
  //나를 제외한 동승 인원 계산
  const companions = party?.members?.filter(
    (member) =>
      member.memberId !== party.myMemberId &&
      !["DECLINED", "LEFT", "REMOVED_UNPAID"].includes(member.decision),
  );
  // matchedAt필요
  const matchedAt = data.matchedAt ? Date.parse(data.matchedAt) : NaN;
  const serverDeadline = party?.confirmDeadlineAt
    ? Date.parse(party.confirmDeadlineAt)
    : NaN;
  const deadline = Number.isFinite(serverDeadline)
    ? serverDeadline
    : data.isPreview !== false && Number.isFinite(matchedAt)
      ? matchedAt + 5 * 60 * 1000
      : null;
  const remainingSeconds =
    deadline == null ? null : Math.max(0, Math.ceil((deadline - now) / 1000));

  return {
    lastTransit: {
      time: formatTime(firstRide?.departureAt),
      place: firstRide
        ? `${firstRide.fromName}${Number.isFinite(walkMinutes) && walkMinutes >= 0 ? ` · 도보 ${walkMinutes}분` : ""}`
        : "경로 정보 확인 중",
      note: transit?.lastLeaveAt
        ? `${formatTime(transit.lastLeaveAt)}까지 출발해야 해요`
        : null,
    },
    matchingDisplay: {
      resultDueLabel: rideRequest?.resultDueAt
        ? transit?.available === true &&
          Date.parse(rideRequest.resultDueAt) <= Date.parse(transit.lastLeaveAt)
          ? "결과는 막차 전에 알려 드려요"
          : `${formatTime(rideRequest.resultDueAt)}까지 결과 안내 예정이에요`
        : "매칭 결과가 나오면 알려 드려요",
      departureTime: formatTime(departureAt),
      pickupPointName,
      directionLabel: direction,
      waitingCount,
      matchedCompanionCount: companions?.length,
      estimatedShareWon: data.mySettlementItem?.estimatedShareWon,
      confirmationTimeLabel:
        deadline == null ? undefined : formatTime(deadline),
      confirmationExpired: remainingSeconds === 0,
      remainingTimeLabel:
        remainingSeconds == null
          ? undefined
          : remainingSeconds === 0
            ? "확정 기한 만료"
            : `${Math.ceil(remainingSeconds / 60)}분 남음`,
    },
    transportDisplay: {
      bus: {
        iconTone: "cyan",
        title: "막차",
        priceLabel: "1인",
        description: `${formatTime(firstRide?.departureAt)} 출발 · ${formatTime(transit?.arrivalAt)} 도착`,
      },
      carpool: {
        iconTone: "primary",
        title: "동승",
        priceLabel: "예상 1인 부담",
        description: `${formatTime(departureAt)} 출발${presentation.poolArrivalAt ? ` · ${formatTime(presentation.poolArrivalAt)} 도착` : ""}`,
        highlight:
          waitingCount != null
            ? `${direction ? `${direction} 방향 ` : ""}${waitingCount}명 대기`
            : null,
      },
      taxi: {
        iconTone: "neutral",
        title: "혼자 택시",
        priceLabel: "1인",
        description: `지금 출발 · ${formatTime(travelOptions?.estimatedArrivalAt)} 도착`,
      },
    },
    pickupPoint: {
      ...data.pickupPoint,
      name: presentation.originLabel ?? data.pickupPoint?.name,
    },
    destinationLabel: travelOptions?.destinationDongName,
  };
}
