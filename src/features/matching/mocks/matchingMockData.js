import { localDate } from "../utils/mapUtils.js";
import { loadKakaoMaps } from "../../../shared/kakaoMaps.js";
import { BANK_OPTIONS } from "../../../shared/constants/banks.js";

export function resolveMockDestination({ region }) {
  return {
    destinationDongId: "31",
    destinationDongName: region.region_3depth_name,
    districtId: "21",
    districtName: `${region.region_1depth_name} ${region.region_2depth_name}`,
  };
}

export async function loadMockPickupPoints() {
  const maps = await loadKakaoMaps();
  return new Promise((resolve, reject) => {
    new maps.services.Places().keywordSearch("단국대학교 죽전캠퍼스 정문", (places, status) => {
      if (status !== maps.services.Status.OK) {
        reject(new Error("정문 위치를 검색하지 못했어요. 잠시 후 다시 조회해 주세요."));
        return;
      }
      const gate = places.find((place) => {
        const name = place.place_name.replace(/\s/g, "");
        return name.includes("단국대학교") && name.includes("죽전") && name.includes("정문")
          && Number.isFinite(Number(place.y)) && Number.isFinite(Number(place.x));
      });
      if (!gate) {
        reject(new Error("단국대학교 죽전캠퍼스 정문 검색 결과가 없어요. 위치를 다시 확인해 주세요."));
        return;
      }
      resolve([{
        id: "11",
        universityId: "1",
        universityName: "단국대학교",
        name: "단국대 정문",
        point: { latitude: Number(gate.y), longitude: Number(gate.x) },
        meetingNote: "죽전캠퍼스 정문 · 미리보기용 거점",
      }]);
    });
  });
}

export function createMockMatchingSlots(date) {
  const nextDate = localDate(new Date(Date.parse(`${date}T00:00:00+09:00`) + 86400000));
  return [
    { date, time: "23:00", waitingCount: 1 },
    { date, time: "23:30", waitingCount: 2 },
    { date: nextDate, time: "00:00", waitingCount: 0 },
    { date: nextDate, time: "00:30", waitingCount: 0 },
  ].map((slot) => ({
    departureAt: `${slot.date}T${slot.time}:00+09:00`,
    waitingCount: slot.waitingCount,
    registrationAllowed: true,
    reason: null,
  }));
}

export function createMockRegistration(slot, selection = {}) {
  const pickupPoint = selection.pickupPoint ?? {
    id: "11", name: "단국대 정문", universityId: "1", universityName: "단국대학교",
  };
  const destination = selection.destination ?? {
    id: "31", name: "영통2동", districtId: "21", districtName: "수원시 영통구",
  };
  return {
    rideRequest: {
      id: "301", journeyId: "201",
      pickupPointId: pickupPoint.id, pickupPointName: pickupPoint.name,
      destinationDongId: destination.id, destinationDongName: destination.name,
      districtId: destination.districtId, districtName: destination.districtName,
      universityId: selection.universityId ?? pickupPoint.universityId,
      universityName: selection.universityName ?? pickupPoint.universityName,
      departureAt: slot.departureAt,
      sameGenderOnly: selection.sameGenderOnly ?? true,
      status: "WAITING", resultDueAt: null, partyId: null,
      createdAt: "2026-11-09T22:30:00+09:00",
    },
    matchingSlot: slot,
  };
}

// API-22 팟과 API-33 정산을 분리한 화면 확인용 목업
export const mockMatchingResult = {
  rideRequest: {
    ...createMockRegistration({ departureAt: "2026-11-05T23:30:00+09:00" }).rideRequest,
    createdAt: "2026-11-05T22:30:00+09:00",
    status: "MATCHED",
    partyId: "401",
    resultDueAt: null,
  },
  party: {
    id: "401",
    status: "CONFIRMING",
    pickupPoint: {
      id: "11", universityId: "1", universityName: "단국대", name: "단국대 정문",
      point: { latitude: 37.331, longitude: 127.271 }, meetingNote: "정문 앞",
    },
    departureAt: "2026-11-05T23:30:00+09:00",
    confirmDeadlineAt: "2026-11-05T23:15:00+09:00",
    representativeMemberId: "503",
    myMemberId: "502",
    routeVersion: 1,
    taxiCalledAt: null,
    roomId: "601",
    allowedActions: [],
    members: [
      { memberId: "501", maskedName: "김*연", universityName: "단국대", sameGenderAsMe: true, destinationDongName: "영통1동", stopOrder: 1, isRepresentative: false, decision: "PENDING", boardingStatus: "UNKNOWN" },
      { memberId: "502", maskedName: "박*연", universityName: "단국대", sameGenderAsMe: true, destinationDongName: "영통2동", stopOrder: 2, isRepresentative: false, decision: "PENDING", boardingStatus: "UNKNOWN" },
      { memberId: "503", maskedName: "이*준", universityName: "단국대", sameGenderAsMe: true, destinationDongName: "매탄동", stopOrder: 3, isRepresentative: true, decision: "PENDING", boardingStatus: "UNKNOWN" },
    ],
  },
  settlement: {
    id: "901", partyId: "401", estimatedTotalWon: 23700, actualTotalWon: null,
    routeVersion: 1, status: "ESTIMATED",
    items: [{
      id: "10002", memberId: "502", estimatedShareWon: 7800, prepayDueWon: 9600,
      actualShareWon: null, refundDueWon: null, status: "ESTIMATED", transfers: [],
    }],
    receiptAvailable: false, finalizedAt: null, refundDueAt: null, allowedActions: [],
  },
  // API-22/33에는 없는 비교 요금·목적지 안내는 이전 화면의 데이터로 전달한다.
  travelOptions: { soloTaxiEstimatedWon: 27400 },
};

// 대표 안내 미리보기: 라우터 state.matchingResult에 전달해서 사용한다.
export const mockRepresentativeMatchingResult = {
  ...mockMatchingResult,
  party: {
    ...mockMatchingResult.party,
    myMemberId: "503",
    roomId: "601",
  },
  settlement: {
    ...mockMatchingResult.settlement,
    estimatedTotalWon: 20300,
    items: [
      { id: "10001", memberId: "501", estimatedShareWon: 4500, prepayDueWon: 5400, actualShareWon: null, refundDueWon: null, status: "ESTIMATED", transfers: [] },
      { id: "10002", memberId: "502", estimatedShareWon: 7900, prepayDueWon: 9500, actualShareWon: null, refundDueWon: null, status: "ESTIMATED", transfers: [] },
      { id: "10003", memberId: "503", estimatedShareWon: 7900, prepayDueWon: 0, actualShareWon: null, refundDueWon: null, status: "ESTIMATED", transfers: [] },
    ],
  },
  banks: BANK_OPTIONS,
};
