import { defaultHomeData } from "./homeMockData";

// 홈 분기 연결 전, 매칭 실패 화면을 직접 확인하기 위한 목업.
export const matchingFailureMock = {
  ...defaultHomeData,
  rideRequest: {
    departureAt: "2026-11-09T23:30:00+09:00",
    status: "FAILED",
  },
  nextSlot: { departureAt: "2026-11-10T00:00:00+09:00", waitingCount: 0 },
  demand: {
    rank: 3,
    description:
      "노선 후보로 학교와 용인시에 제안 중이에요. 오늘 귀가도 수요로 기록돼요.",
  },
  selection: {
    pickupPoint: defaultHomeData.pickupPoint,
    destination: {
      id: "31",
      name: "영통2동",
      districtId: "21",
      districtName: "수원시 영통구",
      point: defaultHomeData.profile.defaultDropoff,
    },
    sameGenderOnly: true,
  },
};
