import { formatTime, formatWon } from "./homeUtils.js";

const duration = (from, to) => {
  const minutes = (Date.parse(to) - Date.parse(from)) / 60000;
  return Number.isFinite(minutes) && minutes >= 0 ? Math.round(minutes) : null;
};
const count = (value) => Number.isFinite(value) && value >= 0;

export function toLastTrainView({ pickupPoint, travelOptions } = {}) {
  const transit = travelOptions?.transit;
  const legs = Array.isArray(transit?.legs) ? transit.legs : [];
  const rides = legs.filter((leg) => ["BUS", "SUBWAY"].includes(leg.mode));
  const available = transit?.available === true && rides.length > 0;
  const minutes = count(transit?.totalDurationMin)
    ? transit.totalDurationMin
    : duration(legs[0]?.departureAt, transit?.arrivalAt);
  const steps = [];
  if (available) {
    legs.forEach((leg, index) => {
      const minutes = duration(leg.departureAt, leg.arrivalAt);
      if (leg.mode === "WALK") {
        const wait = duration(leg.arrivalAt, legs[index + 1]?.departureAt);
        steps.push({
          time: formatTime(leg.departureAt),
          type: "walk",
          title: leg.toName ? `${leg.toName}까지 걷기` : "도보 이동",
          description: [
            minutes != null && `도보 ${minutes}분`,
            count(leg.distanceM) && `${leg.distanceM.toLocaleString("ko-KR")}m`,
            wait > 0 && `${wait}분 여유 두고 출발`,
          ]
            .filter(Boolean)
            .join(" · "),
        });
      } else if (["BUS", "SUBWAY"].includes(leg.mode)) {
        const mode = leg.mode === "SUBWAY" ? "지하철" : "버스";
        steps.push({
          time: formatTime(leg.departureAt),
          type: "transit",
          title: `${leg.fromName ?? "출발 정류장"}에서 ${mode} 타기`,
          description: [
            leg.routeName,
            leg.lastBus === true && `오늘 이 방향 마지막 ${mode}`,
            count(leg.stopCount) && `${leg.stopCount}개 정류장`,
            minutes != null && `${minutes}분`,
          ]
            .filter((value) => value !== false && value != null && value !== "")
            .join(" · "),
        });
        steps.push({
          time: formatTime(leg.arrivalAt),
          type: "transit",
          title: `${leg.toName ?? "도착 정류장"}에서 내리기`,
        });
      }
    });
    steps.push({
      time: formatTime(transit.arrivalAt ?? legs.at(-1)?.arrivalAt),
      type: "home",
      title: `${travelOptions.destinationDongName ?? legs.at(-1)?.toName ?? "하차 지점"} 도착`,
    });
  }
  return {
    available,
    origin: pickupPoint?.name ?? legs[0]?.fromName ?? "출발 위치",
    destination:
      travelOptions?.destinationDongName ?? legs.at(-1)?.toName ?? "하차 지점",
    durationLabel: minutes == null ? "소요 시간 미정" : `${minutes}분`,
    fareLabel: formatWon(transit?.estimatedCostWon),
    deadlineLabel: Number.isFinite(Date.parse(transit?.lastLeaveAt))
      ? `${formatTime(transit.lastLeaveAt)}까지 출발해야 해요`
      : null,
    transferLabel: rides.length
      ? rides.length === 1
        ? "환승 없음"
        : `환승 ${rides.length - 1}회`
      : null,
    sourceLabel: transit?.sourceLabel,
    warnings: Array.isArray(travelOptions?.warnings)
      ? travelOptions.warnings
      : [],
    steps,
  };
}
