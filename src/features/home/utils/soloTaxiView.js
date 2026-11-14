import { formatTime, formatWon } from "./homeUtils.js";

const isAmount = (value) => Number.isFinite(value) && value >= 0;

export function toSoloTaxiView({ pickupPoint, travelOptions } = {}) {
  const travel = travelOptions ?? {};
  const duration = travel.soloTaxiDurationMin;
  const distance = travel.soloTaxiDistanceM;
  const durationLabel = isAmount(duration) ? `${duration}분` : "소요 시간 미정";
  const distanceLabel = isAmount(distance)
    ? `${(distance / 1000).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}km`
    : null;
  const origin = pickupPoint?.name ?? "출발 거점";
  const destination = travel.destinationDongName ?? "하차 지점";
  return {
    origin,
    destination,
    durationLabel,
    distanceLabel,
    fareLabel: formatWon(travel.soloTaxiEstimatedWon),
    poolTitle: isAmount(travel.poolEstimatedShareWon)
      ? `동승하면 약 ${formatWon(travel.poolEstimatedShareWon)}`
      : "동승도 알아볼 수 있어요",
    poolDescription: travel.districtName
      ? `${travel.districtName} 방향 동승을 확인해 보세요.`
      : "출발 시간과 함께 탈 동승자를 확인해 보세요.",
    steps: [
      {
        time: formatTime(travel.asOf),
        type: "walk",
        kind: "pickup",
        title: `${origin}에서 택시 타기`,
        description: pickupPoint?.meetingNote ?? "출발 거점",
      },
      {
        time: formatTime(travel.asOf),
        type: "walk",
        kind: "taxi",
        title: "택시로 이동",
        description: [
          isAmount(duration) && `약 ${durationLabel}`,
          distanceLabel,
        ]
          .filter(Boolean)
          .join(" · "),
      },
      {
        time: formatTime(travel.estimatedArrivalAt),
        type: "home",
        kind: "home",
        title: `${destination} 도착`,
        description: "집 근처 하차 지점",
      },
    ],
    warnings: Array.isArray(travel.warnings) ? travel.warnings : [],
  };
}
