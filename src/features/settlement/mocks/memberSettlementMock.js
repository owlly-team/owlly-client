// 정산 조회 API의 data와 같은 구조. 계좌·화면 제목은 응답에 포함하지 않는다.
export const memberSettlementMock = {
  id: "901",
  partyId: "401",
  estimatedTotalWon: 30000,
  actualTotalWon: 30000,
  routeVersion: 2,
  status: "REFUNDING",
  items: [
    {
      id: "10001",
      memberId: "501",
      maskedName: "김*연",
      distanceMeters: 8000,
      isRepresentative: false,
      isMe: false,
      estimatedShareWon: 5000,
      prepayDueWon: 5400,
      actualShareWon: 5000,
      refundDueWon: 400,
      status: "REFUND_PENDING",
      transfers: [
        {
          id: "801",
          settlementItemId: "10001",
          kind: "PREPAY",
          payerMemberId: "501",
          payeeMemberId: "503",
          amountWon: 5400,
          status: "RECEIVED",
          sentAt: "2026-11-05T23:22:00+09:00",
          receivedAt: "2026-11-05T23:23:00+09:00",
        },
        {
          id: "802",
          settlementItemId: "10001",
          kind: "REFUND",
          payerMemberId: "503",
          payeeMemberId: "501",
          amountWon: 400,
          status: "PENDING",
          sentAt: null,
          receivedAt: null,
        },
      ],
    },
    {
      id: "10002",
      memberId: "502",
      maskedName: "박*연",
      distanceMeters: 12000,
      isRepresentative: false,
      isMe: true,
      estimatedShareWon: 8750,
      prepayDueWon: 9500,
      actualShareWon: 8750,
      refundDueWon: 750,
      status: "REFUND_PENDING",
      transfers: [
        {
          id: "803",
          settlementItemId: "10002",
          kind: "PREPAY",
          payerMemberId: "502",
          payeeMemberId: "503",
          amountWon: 9500,
          status: "RECEIVED",
          sentAt: "2026-11-05T23:22:00+09:00",
          receivedAt: "2026-11-05T23:23:00+09:00",
        },
        {
          id: "804",
          settlementItemId: "10002",
          kind: "REFUND",
          payerMemberId: "503",
          payeeMemberId: "502",
          amountWon: 750,
          status: "PENDING",
          sentAt: null,
          receivedAt: null,
        },
      ],
    },
    {
      id: "10003",
      memberId: "503",
      maskedName: "이*준",
      distanceMeters: 16000,
      isRepresentative: true,
      isMe: false,
      estimatedShareWon: 16250,
      prepayDueWon: 0,
      actualShareWon: 16250,
      refundDueWon: 0,
      status: "COMPLETED",
      transfers: [],
    },
  ],
  receiptAvailable: true,
  finalizedAt: "2026-11-06T00:10:00+09:00",
  refundDueAt: "2026-11-13T00:10:00+09:00",
  allowedActions: [],
};

export const representativeSettlementMock = {
  ...memberSettlementMock,
  items: memberSettlementMock.items.map((item) => ({
    ...item,
    isMe: item.isRepresentative,
  })),
};

// 정산 조회와 별도인 대표 계좌 문맥의 미리보기.
export const previewRepresentativeAccount = {
  memberId: "503",
  bankName: "KB국민은행",
  accountNumber: "943202-01-482917",
  maskedHolderName: "이*준",
};

export function getMemberSettlementPreview(kind) {
  // refund: 돌려받기, additional: 추가 납부, even: 차액 없음.
  if (kind === "refund") return memberSettlementMock;
  if (kind !== "additional" && kind !== "even") return memberSettlementMock;
  return {
    ...memberSettlementMock,
    items: memberSettlementMock.items.map((item) => {
      if (item.memberId === "503") return item;
      const paidWon =
        kind === "even"
          ? item.actualShareWon
          : item.memberId === "502"
            ? 5400
            : 9500;
      const refundDueWon = paidWon - item.actualShareWon;
      return {
        ...item,
        refundDueWon,
        status: refundDueWon === 0 ? "COMPLETED" : item.status,
        transfers: item.transfers
          .filter((transfer) => transfer.kind === "PREPAY")
          .map((transfer) => ({ ...transfer, amountWon: paidWon })),
      };
    }),
  };
}
