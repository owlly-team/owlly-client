export const isWon = (value) => Number.isSafeInteger(value) && value >= 0;

export function getSettlementItems(settlement, partyId) {
  const items = settlement?.items;
  if (
    !partyId ||
    settlement?.partyId !== partyId ||
    !Array.isArray(items) ||
    items.some(
      (item) => !item || typeof item.memberId !== "string" || !item.memberId,
    ) ||
    new Set(items.map((item) => item.memberId)).size !== items.length
  )
    return [];
  return items;
}

export function getSettlementIdentity(settlement, partyId, party) {
  const items = getSettlementItems(settlement, partyId);
  if (
    party?.routeVersion != null &&
    party.routeVersion !== settlement?.routeVersion
  )
    return null;
  // 일반 멤버의 API-33은 본인 항목만 반환한다. 대표 식별 정보는 API-22에서 얻는다.
  if (
    party?.id === partyId &&
    items.length === 1 &&
    items[0].memberId === party.myMemberId &&
    items[0].isMe === true &&
    items[0].isRepresentative === false &&
    party.myMemberId !== party.representativeMemberId
  ) {
    const representative = party.members?.find(
      (member) => member.memberId === party.representativeMemberId,
    );
    if (!representative) return null;
    return { mine: items[0], representative, items };
  }
  const mine = items.filter((item) => item.isMe === true);
  const representatives = items.filter(
    (item) => item.isRepresentative === true,
  );
  if (
    mine.length !== 1 ||
    representatives.length !== 1 ||
    items.some(
      (item) =>
        typeof item.isMe !== "boolean" ||
        typeof item.isRepresentative !== "boolean",
    )
  )
    return null;
  if (
    party &&
    (party.id !== partyId ||
      party.myMemberId !== mine[0].memberId ||
      party.representativeMemberId !== representatives[0].memberId)
  )
    return null;
  return { mine: mine[0], representative: representatives[0], items };
}

export function formatDistance(distanceMeters) {
  if (
    typeof distanceMeters !== "number" ||
    !Number.isFinite(distanceMeters) ||
    distanceMeters < 0
  )
    return null;
  return `${(distanceMeters / 1000).toLocaleString("ko-KR", { maximumFractionDigits: 3 })}km`;
}

export function getPrepaidWon(
  item,
  representativeMemberId,
  receivedOnly = false,
) {
  if (
    item.isRepresentative ||
    !representativeMemberId ||
    !Array.isArray(item.transfers) ||
    item.transfers.some((transfer) => !transfer || typeof transfer !== "object")
  )
    return null;
  const transfers = item.transfers.filter(
    (transfer) =>
      transfer.kind === "PREPAY" &&
      transfer.settlementItemId === item.id &&
      transfer.payerMemberId === item.memberId &&
      transfer.payeeMemberId === representativeMemberId &&
      (receivedOnly
        ? transfer.status === "RECEIVED"
        : ["SENT", "RECEIVED"].includes(transfer.status)),
  );
  if (
    transfers.some(
      (transfer) =>
        !isWon(transfer.amountWon) ||
        typeof transfer.id !== "string" ||
        !transfer.id,
    ) ||
    new Set(transfers.map((transfer) => transfer.id)).size !== transfers.length
  )
    return null;
  const total = transfers.reduce(
    (sum, transfer) => sum + transfer.amountWon,
    0,
  );
  return isWon(total) ? total : null;
}

const won = (value) =>
  isWon(value) ? `${value.toLocaleString("ko-KR")}원` : "-";

export function toSettlementRows(
  settlement,
  { partyId, party, final = false, receivedOnly = false },
) {
  const items = getSettlementItems(settlement, partyId);
  const representativeId =
    (party?.id === partyId ? party.representativeMemberId : null) ??
    items.find((item) => item.isRepresentative === true)?.memberId;
  const ordered =
    party?.id === partyId
      ? [...items].sort((a, b) => {
          const order = (item) =>
            party.members?.find((member) => member.memberId === item.memberId)
              ?.stopOrder ?? Infinity;
          return order(a) - order(b);
        })
      : items;
  return ordered.map((item) => {
    const difference = item.refundDueWon;
    const distance = formatDistance(item.distanceMeters);
    const member =
      party?.id === partyId
        ? party.members?.find((entry) => entry.memberId === item.memberId)
        : null;
    return {
      memberId: item.memberId,
      name: `${item.isMe ? "나" : (item.maskedName ?? "이름 미정")}${item.isRepresentative ? " · 대표" : ""}`,
      note: [member?.destinationDongName, distance && `${distance} 구간`]
        .filter(Boolean)
        .join(" · "),
      confirmed: won(
        final
          ? item.actualShareWon
          : (item.actualShareWon ?? item.estimatedShareWon),
      ),
      received: item.isRepresentative
        ? "-"
        : won(getPrepaidWon(item, representativeId, receivedOnly)),
      refund:
        item.isRepresentative || !Number.isSafeInteger(difference)
          ? "-"
          : `${difference > 0 ? "+" : ""}${difference.toLocaleString("ko-KR")}원`,
      isRepresentative: item.isRepresentative === true,
      isAdditionalPayment: Number.isSafeInteger(difference) && difference < 0,
    };
  });
}

export function isFinalSettlement(settlement, partyId) {
  const items = getSettlementItems(settlement, partyId);
  return (
    ["REFUNDING", "COMPLETED", "REVIEW_REQUIRED"].includes(
      settlement?.status,
    ) &&
    Number.isFinite(Date.parse(settlement.finalizedAt)) &&
    isWon(settlement?.actualTotalWon) &&
    items.length > 0 &&
    items.every(
      (item) =>
        isWon(item.actualShareWon) && Number.isSafeInteger(item.refundDueWon),
    )
  );
}
