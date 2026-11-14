import { isPoint } from "../../matching/utils/mapUtils.js";
import { getSlotDates, upcomingSlots } from "./loadHomeData.js";

export function mergeHomeComparison(previous, next, now = Date.now()) {
  const sameSelection =
    previous?.pickupPoint?.id === next.pickupPoint?.id &&
    previous?.travelOptions?.destinationDongId ===
      next.travelOptions?.destinationDongId &&
    previous?.profile?.sameGenderDefault === next.profile?.sameGenderDefault;
  return next.slotsLoading && sameSelection
    ? {
        ...next,
        matchingSlots: upcomingSlots(previous.matchingSlots ?? [], now),
      }
    : next;
}

export async function loadHomeComparison(
  api,
  { profile, pickupPoint, now = new Date(), signal },
  publish,
) {
  if (!isPoint(profile.defaultDropoff))
    throw new Error("기본 하차 위치를 확인해 주세요.");
  const { data: travel } = await api.travelOptions({
    pickupPointId: pickupPoint.id,
    dropoff: profile.defaultDropoff,
    departureAt: now.toISOString(),
  });
  if (signal?.aborted) return;
  if (
    !travel?.destinationDongId ||
    (travel.pickupPointId != null && travel.pickupPointId !== pickupPoint.id)
  )
    throw new Error("하차 지점의 교통 정보를 확인할 수 없어요.");
  const data = {
    profile,
    pickupPoint,
    isPreview: false,
    travelOptions: {
      ...travel,
      destinationDongName:
        travel.destinationDongName ??
        (travel.destinationDongId === profile.defaultDongId
          ? profile.defaultDongName
          : undefined),
      universityId: profile.user.universityId,
      universityName: profile.user.universityName,
    },
    matchingSlots: [],
    presentation: { directionLabel: travel.districtName },
    slotsLoading: true,
    slotsError: null,
  };
  // 외부 교통 정보가 도착하면 시간대 조회 완료를 기다리지 않고 표시한다.
  publish(data);
  const results = await Promise.allSettled(
    getSlotDates(now).map((date) =>
      api.slots({
        pickupPointId: pickupPoint.id,
        destinationDongId: travel.destinationDongId,
        date,
        sameGenderOnly: String(profile.sameGenderDefault),
      }),
    ),
  );
  if (signal?.aborted) return;
  const denied = results.find(
    (item) =>
      item.status === "rejected" && [401, 403].includes(item.reason.status),
  );
  if (denied) throw denied.reason;
  const pages = results.filter(
    (item) => item.status === "fulfilled" && Array.isArray(item.value.data),
  );
  const incomplete = pages.length !== results.length;
  publish({
    ...data,
    matchingSlots: upcomingSlots(
      pages.flatMap((item) => item.value.data),
      now.getTime(),
    ),
    slotsLoading: false,
    slotsError: incomplete
      ? "동승 출발 시간대를 불러오지 못했어요. 잠시 후 다시 확인할게요."
      : null,
  });
}
