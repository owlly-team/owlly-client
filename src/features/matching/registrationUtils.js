import { formatTime } from "../home/homeUtils.js";

const messages = {
  WAITING: ["동승을 등록했어요", "같은 조건으로 등록한 사람과 매칭되면 알림으로 알려드려요."],
  MATCHED: ["동승이 매칭됐어요", "매칭 결과를 확인하고 참여를 확정해 주세요."],
  FAILED: ["동승이 매칭되지 않았어요", "다른 출발 시간이나 귀가 방법을 확인해 주세요."],
  CANCELLED: ["동승 등록이 취소됐어요", "필요하면 출발 시간을 다시 선택해 주세요."],
  EXPIRED: ["동승 신청이 만료됐어요", "새 출발 시간을 선택해 다시 신청해 주세요."],
};

export function toRegistrationView(rideRequest, display = {}, matchingSlot = null) {
  const message = rideRequest?.id && messages[rideRequest.status];
  if (!message) return {
    title: "신청 정보를 확인할 수 없어요",
    description: "홈에서 등록 내용을 다시 확인해 주세요.",
    rows: [],
  };
  const count = matchingSlot?.departureAt === rideRequest.departureAt
    ? matchingSlot.waitingCount : null;
  return {
    title: message[0], description: message[1],
    waiting: rideRequest.status === "WAITING",
    partyId: rideRequest.status === "MATCHED" ? rideRequest.partyId : null,
    canRetry: ["FAILED", "CANCELLED", "EXPIRED"].includes(rideRequest.status),
    resultDueLabel: rideRequest.status === "WAITING" && rideRequest.resultDueAt
      ? `${formatTime(rideRequest.resultDueAt)}까지 매칭 결과 안내 예정이에요.` : null,
    rows: [
      { term: "출발", value: `${display.pickupPoint?.id === rideRequest.pickupPointId ? display.pickupPoint.name : "거점 확인 필요"} · ${formatTime(rideRequest.departureAt)}` },
      { term: "하차 지점", value: display.destinationDong?.id === rideRequest.destinationDongId ? display.destinationDong.name : "하차 지점 확인 필요" },
      { term: "동성 매칭", value: rideRequest.sameGenderOnly === true ? "켜짐" : rideRequest.sameGenderOnly === false ? "꺼짐" : "확인 필요" },
      { term: "지금 대기", value: Number.isInteger(count) && count >= 0 ? `${count}명` : "확인 필요", accent: true },
    ],
  };
}
