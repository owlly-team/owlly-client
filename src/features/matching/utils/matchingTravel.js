import { loadCurrentRide } from "../../home/utils/loadHomeData.js";
import { isPoint } from "./mapUtils.js";

export async function loadMatchingTravel(
  api,
  partyId,
  previous,
  now = Date.now(),
) {
  const { party, rideRequest, journey } = await loadCurrentRide(api);
  if (
    party?.id !== partyId ||
    rideRequest?.partyId !== partyId ||
    rideRequest.status !== "MATCHED" ||
    rideRequest.pickupPointId !== party.pickupPoint?.id ||
    !rideRequest.destinationDongId
  )
    throw new Error("이 팟의 교통 비교 조건을 확인할 수 없어요.");

  const selection = previous?.selection;
  let dropoff = isPoint(rideRequest.dropoff)
    ? rideRequest.dropoff
    : journey?.id === rideRequest.journeyId && isPoint(journey.dropoff)
      ? journey.dropoff
      : previous?.rideRequest?.id === rideRequest.id &&
          selection?.pickupPoint?.id === rideRequest.pickupPointId &&
          selection?.destination?.id === rideRequest.destinationDongId &&
          isPoint(selection.destination.point)
        ? selection.destination.point
        : null;
  let usingDefaultDropoff = false;
  if (!dropoff) {
    const { data: profile } = await api.profile();
    if (
      profile?.defaultDongId === rideRequest.destinationDongId &&
      isPoint(profile.defaultDropoff)
    ) {
      dropoff = profile.defaultDropoff;
      usingDefaultDropoff = true;
    }
  }
  if (!dropoff)
    throw new Error(
      "신청한 하차 위치를 복원할 수 없어 교통 정보를 비교할 수 없어요.",
    );
  const { data: travelOptions } = await api.travelOptions({
    pickupPointId: rideRequest.pickupPointId,
    dropoff,
    departureAt: new Date(now).toISOString(),
  });
  if (
    !travelOptions ||
    travelOptions.destinationDongId !== rideRequest.destinationDongId ||
    (travelOptions.pickupPointId != null &&
      travelOptions.pickupPointId !== rideRequest.pickupPointId)
  )
    throw new Error("교통 비교 응답의 출발·하차 위치가 신청과 달라요.");
  return { travelOptions, rideRequest, usingDefaultDropoff };
}

export function getMatchingTransitNotice(travelOptions, now) {
  const transit = travelOptions?.transit;
  const deadline = Date.parse(transit?.lastLeaveAt);
  if (
    transit?.available === false ||
    (Number.isFinite(deadline) && now > deadline)
  )
    return { status: "unavailable" };
  if (transit?.available === true && Number.isFinite(deadline))
    return { status: "available", lastLeaveAt: transit.lastLeaveAt };
  return { status: "unknown" };
}
