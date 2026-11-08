export function formatWon(amount, approximate = false) {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return "금액 미정";
  return `${approximate ? "약 " : ""}${amount.toLocaleString("ko-KR")}원`;
}

// TravelOptions 원본 금액을 기존 카드 props 배열로 변환한다.
// bus/carpool/taxi는 UI 식별자이며 JourneyChoice.mode(BUS/SOLO)가 아니다.
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

// 홈 표시 전용 파생 값. 백엔드 상태에 저장하거나 API로 전달하지 않음
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

  // FAILED, CANCELLED, EXPIRED 및 신청 없음은 일반 홈
  return requestStatus === "WAITING" ? "MATCHING_WAITING" : null;
}

