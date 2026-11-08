export const defaultHomeData = {
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

