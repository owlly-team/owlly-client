import { formatTime, formatWon } from "./homeUtils.js";
import { getPrepaidWon } from "../../settlement/utils/settlementUtils.js";

export function isHomeRideFinalized(data) {
  const party = data?.party;
  const settlement = data?.settlement;
  return Boolean(
    party?.id &&
    data.rideRequest?.status === "MATCHED" &&
    data.rideRequest.partyId === party.id &&
    settlement?.partyId === party.id &&
    (party.routeVersion == null ||
      settlement.routeVersion === party.routeVersion) &&
    ["REFUNDING", "COMPLETED", "REVIEW_REQUIRED"].includes(settlement.status) &&
    Number.isFinite(Date.parse(settlement.finalizedAt)),
  );
}

export function getHomeRideParty(data) {
  const party = data?.party;
  if (!party?.id || isHomeRideFinalized(data)) return null;
  return data?.rideRequest?.status === "MATCHED" &&
    data.rideRequest.partyId === party?.id &&
    ["PREPAYING", "READY", "RIDING", "SETTLING"].includes(party.status)
    ? party
    : null;
}

export function toRideProgressView(
  data,
  room,
  now = Date.now(),
  preview = null,
) {
  const party = getHomeRideParty(data);
  if (!party) return null;
  const members = [...(party.members ?? [])]
    .filter(
      (member) =>
        !["LEFT", "DECLINED", "REMOVED_UNPAID"].includes(member.decision),
    )
    .sort((a, b) => (a.stopOrder ?? Infinity) - (b.stopOrder ?? Infinity));
  const me = members.find((member) => member.memberId === party.myMemberId);
  if (!me) return null;
  const representative = members.find(
    (member) => member.memberId === party.representativeMemberId,
  );
  const isRepresentative = me.memberId === party.representativeMemberId;
  const validRoom =
    room?.partyId === party.id &&
    room.id &&
    (!party.roomId || room.id === party.roomId) &&
    room.status === "OPEN"
      ? room
      : null;
  const verificationCode = /^\d{4}$/.test(validRoom?.verificationCode ?? "")
    ? validRoom.verificationCode
    : null;
  const example = data.isPreview === true ? preview : null;
  const unreadCount =
    validRoom &&
    Number.isSafeInteger(example?.unreadCount) &&
    example.unreadCount > 0
      ? example.unreadCount
      : null;
  const departure = Date.parse(party.departureAt);
  const minutes = Number.isFinite(departure)
    ? Math.max(0, Math.ceil((departure - now) / 60000))
    : null;
  const pickupName = party.pickupPoint?.name ?? data.pickupPoint?.name;
  const direction = party.districtName ?? data.rideRequest.districtName;
  const item =
    data.settlement?.partyId === party.id &&
    (party.routeVersion == null ||
      data.settlement.routeVersion === party.routeVersion)
      ? data.settlement.items?.find((entry) => entry.memberId === me.memberId)
      : !data.settlement && data.mySettlementItem?.memberId === me.memberId
        ? data.mySettlementItem
        : null;
  const amount =
    Number.isSafeInteger(item?.prepayDueWon) && item.prepayDueWon >= 0
      ? item.prepayDueWon
      : null;
  const currentSettlement =
    data.settlement?.partyId === party.id &&
    (party.routeVersion == null ||
      data.settlement.routeVersion === party.routeVersion)
      ? data.settlement
      : null;
  const paid = (member, receivedOnly) => {
    const payment = currentSettlement?.items?.find(
      (entry) => entry.memberId === member.memberId,
    );
    return (
      Number.isSafeInteger(payment?.prepayDueWon) &&
      payment.prepayDueWon >= 0 &&
      (payment.prepayDueWon === 0 ||
        getPrepaidWon(payment, party.representativeMemberId, receivedOnly) >=
          payment.prepayDueWon)
    );
  };
  const payers = members.filter(
    (member) => member.memberId !== party.representativeMemberId,
  );
  const prepayRecorded = isRepresentative
    ? payers.length > 0 && payers.every((member) => paid(member, true))
    : paid(me, false);
  const boarded = me.boardingStatus === "BOARDED";
  const taxiCalled =
    Number.isFinite(Date.parse(party.taxiCalledAt)) ||
    ["READY", "RIDING", "SETTLING"].includes(party.status);
  // 하차 기록이 없으므로 다른 멤버의 하차 완료를 시각이나 순서로 추정하지 않는다.
  const currentStepId =
    party.status === "SETTLING"
      ? "settlement"
      : boarded
        ? me.memberId
        : taxiCalled || prepayRecorded
          ? "taxi"
          : Number.isFinite(departure) && now >= departure
            ? "prepay"
            : "meet";
  const shortTime = (at, fallback = "미정") =>
    Number.isFinite(Date.parse(at)) ? formatTime(at) : fallback;
  const steps = [
    {
      id: "meet",
      time: shortTime(party.departureAt),
      type: "walk",
      kind: "meet",
      title: pickupName ? `${pickupName}에서 만나기` : "출발 거점에서 만나기",
      description: verificationCode
        ? `확인 코드 ${verificationCode} 맞추기`
        : "만나면 확인 코드를 맞춰요",
    },
    {
      id: "prepay",
      time: shortTime(example?.prepayAt, "집결 후"),
      type: "walk",
      kind: "prepay",
      title: isRepresentative
        ? "멤버들의 선입금 확인하기"
        : amount == null
          ? "대표에게 선입금 보내기"
          : `대표에게 ${formatWon(amount)} 먼저 보내기`,
      description: isRepresentative
        ? "입금 내역을 확인한 뒤 택시를 불러 주세요"
        : amount == null
          ? "송금액은 채팅방에서 확인해 주세요"
          : "내린 뒤 차액은 정산 화면에서 확인해요",
    },
    {
      id: "taxi",
      time: shortTime(example?.taxiAt, "입금 후"),
      type: "walk",
      kind: "taxi",
      title: taxiCalled
        ? "택시 탑승 확인하기"
        : representative?.maskedName
          ? `대표 ${representative.maskedName}님이 택시 부르기`
          : "대표가 택시 부르기",
      description: "타면 채팅방에서 탔어요를 눌러 주세요",
    },
    ...members.map((member, index) => {
      const mine = member.memberId === me.memberId;
      const leader = member.memberId === party.representativeMemberId;
      return {
        id: member.memberId,
        time: shortTime(example?.arrivals?.[member.memberId]),
        type: mine ? "home" : "walk",
        kind: mine ? "home" : "dropoff",
        title: `${mine ? "나" : (member.maskedName ?? "멤버")} 내림${leader ? " · 대표" : ""}`,
        description: [
          member.destinationDongName,
          Number.isInteger(member.stopOrder) && member.stopOrder > 0
            ? `${member.stopOrder}번째 하차`
            : null,
          leader
            ? `${index === members.length - 1 ? "마지막 하차 · " : ""}내리면 정산 시작`
            : null,
        ]
          .filter(Boolean)
          .join(" · "),
      };
    }),
  ];
  if (party.status === "SETTLING")
    steps.push({
      id: "settlement",
      time: "하차 후",
      type: "home",
      kind: "settlement",
      title: isRepresentative ? "정산 입력·확정하기" : "정산 내역 확인하기",
      description: "채팅방에서 정산을 확인해 주세요",
    });
  const currentIndex = steps.findIndex((step) => step.id === currentStepId);
  return {
    partyId: party.id,
    roomId: validRoom?.id ?? party.roomId,
    title: `${formatTime(party.departureAt)} ${pickupName ?? "출발 거점"} 출발`,
    subtitle: [
      direction && `${direction} 방향`,
      `${members.length}명`,
      party.status === "RIDING"
        ? "탑승 중"
        : party.status === "SETTLING"
          ? "정산 중"
          : minutes == null
            ? null
            : minutes > 0
              ? `집결까지 ${minutes}분`
              : "집결 시간이 됐어요",
    ]
      .filter(Boolean)
      .join(" · "),
    verificationCode,
    unreadCount,
    steps: steps.map((step, index) => ({
      ...step,
      state:
        step.id === currentStepId
          ? "current"
          : index < 3 && index < currentIndex
            ? "past"
            : "upcoming",
    })),
  };
}
