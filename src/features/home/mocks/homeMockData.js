
const at = (time) => `2026-11-09T${time}:00+09:00`;
const pickupPoint = {
  id: "11", universityId: "1", universityName: "단국대학교", name: "단국대 정문",
  point: { latitude: 37.331, longitude: 127.271 }, meetingNote: "정문 앞",
};
const rideRequest = {
  id: "301", journeyId: "201", pickupPointId: "11", districtId: "21",
  pickupPointName: "단국대 정문", districtName: "수원시 영통구",
  destinationDongName: "영통2동", universityId: "1", universityName: "단국대학교",
  destinationDongId: "31", departureAt: at("23:30"), sameGenderOnly: true,
  status: "WAITING", resultDueAt: at("22:43"), partyId: null, createdAt: at("22:30"),
};
export const defaultHomeData = {
  pickupPoint,
  // 프로필 조회 연동 전 화면 확인용 가상 기본값. 실제 하차 좌표 아님.
  profile: {
    sameGenderDefault: true,
    defaultDropoff: { latitude: 37.33, longitude: 127.27 },
  },
  travelOptions: {
    transit: {
      available: true, lastLeaveAt: at("22:49"), arrivalAt: at("23:41"),
      estimatedCostWon: 1550,
      legs: [
        { mode: "WALK", routeName: null, fromName: "단국대 정문", toName: "정문 정류장", departureAt: at("22:49"), arrivalAt: at("22:53") },
        { mode: "BUS", routeName: null, fromName: "정문 정류장", toName: "영통역 정류장", departureAt: at("22:58"), arrivalAt: at("23:29") },
        { mode: "WALK", routeName: null, fromName: "영통역 정류장", toName: "영통2동", departureAt: at("23:29"), arrivalAt: at("23:41") },
      ],
      sourceLabel: "목업 추정값", asOf: at("22:30"),
    },
    soloTaxiEstimatedWon: 27400, poolEstimatedShareWon: 7900,
    estimatedArrivalAt: at("23:05"), destinationDongId: "31", districtId: "21",
    destinationDongName: "영통2동", districtName: "수원시 영통구",
    pickupPointId: "11", pickupPointName: "단국대 정문",
    universityId: "1", universityName: "단국대학교",
    asOf: at("22:30"), warnings: [],
  },
  rideRequest: null,
  party: null,
  matchingSlots: [{ departureAt: at("23:30"), waitingCount: 2, registrationAllowed: true, reason: null }],
  presentation: { originLabel: "단국대 정문 근처", directionLabel: "영통구", poolArrivalAt: "2026-11-10T00:00:00+09:00" },
};
const party = {
  id: "401", status: "CONFIRMING", pickupPoint, departureAt: at("23:30"),
  representativeMemberId: "501", myMemberId: "501",
  members: ["501", "502", "503", "504"].map((memberId) => ({
    memberId, maskedName: "김*연", universityName: "단국대학교", destinationDongName: "영통2동",
    sameGenderAsMe: true, isRepresentative: memberId === "501", decision: "PENDING",
    boardingStatus: "UNKNOWN", stopOrder: null,
  })),
  routeVersion: 1, taxiCalledAt: null, roomId: null, allowedActions: [],
};
// Home의 data prop에 넣어 네 가지 시안을 확인한다.
export const homeScenarios = {
  beforeLastTransit: defaultHomeData,
  afterLastTransit: {
    ...defaultHomeData,
    travelOptions: {
      ...defaultHomeData.travelOptions,
      transit: { ...defaultHomeData.travelOptions.transit, available: false, lastLeaveAt: null, arrivalAt: null, estimatedCostWon: null, legs: [] },
      estimatedArrivalAt: at("23:40"),
    },
    matchingSlots: [{ departureAt: "2026-11-10T00:00:00+09:00", waitingCount: 1, registrationAllowed: true, reason: null }],
    presentation: { ...defaultHomeData.presentation, poolArrivalAt: "2026-11-10T00:30:00+09:00" },
  },
  waiting: { ...defaultHomeData, rideRequest },
  matched: {
    ...defaultHomeData,
    rideRequest: { ...rideRequest, status: "MATCHED", partyId: party.id },
    party,
    mySettlementItem: {
      id: "601", memberId: "501", estimatedShareWon: 7900, prepayDueWon: 0,
      actualShareWon: null, refundDueWon: null, status: "ESTIMATED", transfers: [],
    },

    matchedAt: at("22:44"),
    previewNow: at("22:44"),
  },
};
