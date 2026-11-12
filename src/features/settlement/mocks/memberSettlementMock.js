// 화면 확인용 정산 결과. 계좌는 사용자가 직접 입력하며 예시로 채우지 않는다.
export const memberSettlementMock = {
  partyId: "401",
  myMemberId: "502",
  representativeMemberId: "503",
  title: "정문 → 영통구 · 3명",
  totalFareWon: 30000,
  items: [
    {
      memberId: "501",
      name: "김*연",
      note: "8km 구간",
      confirmedWon: 5000,
      paidWon: 5400,
      differenceWon: 400,
    },
    {
      memberId: "502",
      name: "나",
      note: "12km 구간",
      confirmedWon: 8750,
      paidWon: 9500,
      differenceWon: 750,
    },
    {
      memberId: "503",
      name: "이*준 · 대표",
      note: "16km 구간",
      confirmedWon: 16250,
      paidWon: null,
      differenceWon: null,
    },
  ],
};

export function getMemberSettlementPreview(kind) {
  // refund: 돌려받기, additional: 추가 납부, even: 차액 없음.
  if (kind === "refund") return memberSettlementMock;
  if (kind !== "additional" && kind !== "even") return memberSettlementMock;
  return {
    ...memberSettlementMock,
    representativeAccount:
      kind === "additional"
        ? {
            memberId: "503",
            bankName: "KB국민은행",
            accountNumber: "943202-01-482917",
            maskedHolderName: "이*준",
          }
        : null,
    items: memberSettlementMock.items.map((item) => {
      if (item.memberId === "503") return item;
      const paidWon =
        kind === "even"
          ? item.confirmedWon
          : item.memberId === "502"
            ? 5400
            : 9500;
      return { ...item, paidWon, differenceWon: paidWon - item.confirmedWon };
    }),
  };
}
