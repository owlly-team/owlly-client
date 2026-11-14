import { isPoint } from "../../matching/utils/mapUtils.js";
import {
  loadHomePickupPoints,
  selectSchoolPickupPoint,
} from "./loadHomeData.js";

export async function loadLastTrain(api, source, userId, now = Date.now()) {
  let context = source;
  if (!context?.pickupPoint?.id || !isPoint(context.dropoff)) {
    const { data: profile } = await api.profile();
    if (profile?.user?.id !== userId || !isPoint(profile.defaultDropoff))
      throw new Error("기본 하차 위치를 확인해 주세요.");
    const { pickupPoints } = await loadHomePickupPoints(
      api,
      profile.user.universityId,
    );
    const pickupPoint = selectSchoolPickupPoint(pickupPoints, {
      universityId: profile.user.universityId,
    });
    if (!pickupPoint)
      throw new Error(
        "이용 가능한 출발 거점이 없어요. 홈에서 출발 위치를 선택해 주세요.",
      );
    context = {
      pickupPoint,
      dropoff: profile.defaultDropoff,
      sameGenderDefault: profile.sameGenderDefault,
    };
  }
  const { data: travelOptions } = await api.travelOptions({
    pickupPointId: context.pickupPoint.id,
    dropoff: context.dropoff,
    departureAt: new Date(now).toISOString(),
  });
  if (
    !travelOptions?.destinationDongId ||
    (travelOptions.pickupPointId != null &&
      travelOptions.pickupPointId !== context.pickupPoint.id)
  )
    throw new Error("교통 정보의 출발·하차 위치를 확인할 수 없어요.");
  return { ...context, travelOptions };
}
