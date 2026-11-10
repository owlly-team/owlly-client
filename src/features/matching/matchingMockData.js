import { localDate } from "./mapUtils.js";
import { loadKakaoMaps } from "../../shared/kakaoMaps.js";

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
