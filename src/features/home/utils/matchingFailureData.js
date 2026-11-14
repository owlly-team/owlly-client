import { getSlotDates, upcomingSlots } from "./loadHomeData.js";
import { applySlotDeadlines } from "../../../shared/utils/time.js";
import { isPoint } from "../../matching/utils/mapUtils.js";

export async function findMyJourney(api, journeyId) {
  let cursor;
  const visited = new Set();
  do {
    const page = await api.journeys(cursor);
    if (!Array.isArray(page.data))
      throw new Error("귀가 내역을 확인할 수 없어요.");
    const journey = page.data.find(
      (item) => String(item.id) === String(journeyId),
    );
    if (journey) return journey;
    if (!page.meta?.hasMore) break;
    cursor = page.meta.nextCursor;
    if (!cursor || visited.has(cursor))
      throw new Error("귀가 내역을 끝까지 확인하지 못했어요.");
    visited.add(cursor);
  } while (cursor);
  throw new Error("이 신청의 귀가 내역을 확인할 수 없어요.");
}

export function canResolveFailure(data) {
  return (
    data?.rideRequest?.status === "FAILED" &&
    data.journey?.outcome === "UNRESOLVED" &&
    (!data.journey.activeRequestId ||
      String(data.journey.activeRequestId) === String(data.rideRequest.id))
  );
}

export async function loadMatchingFailure(
  api,
  requestId,
  previousSelection,
  now = Date.now(),
) {
  const { data: rideRequest } = await api.rideRequest(requestId);
  if (rideRequest?.id !== String(requestId) || !rideRequest.journeyId)
    throw new Error("매칭 신청 정보를 확인할 수 없어요.");
  const journey = await findMyJourney(api, rideRequest.journeyId);
  const context = { isPreview: false, journey, rideRequest };
  if (!canResolveFailure(context)) return context;
  const warnings = [];
  async function optional(load, message) {
    try {
      return (await load()).data;
    } catch (error) {
      if ([401, 403].includes(error.status) || error.name === "AbortError")
        throw error;
      warnings.push(message);
      return null;
    }
  }
  const [profile, points] = await Promise.all([
    optional(() => api.profile(), "기본 하차 위치를 불러오지 못했어요."),
    optional(
      () => api.pickupPoints(journey.universityId),
      "출발 거점 정보를 불러오지 못했어요.",
    ),
  ]);
  const pickupPoint = points?.find(
    (point) => point.id === rideRequest.pickupPointId,
  ) ?? {
    id: rideRequest.pickupPointId,
    name: rideRequest.pickupPointName ?? journey.pickupPointName ?? "출발 거점",
  };
  // 이전 핀 또는 같은 행정동의 기본 위치만 사용한다. 다른 동의 프로필 좌표를 대신 쓰지 않는다.
  const point =
    previousSelection?.pickupPoint?.id === rideRequest.pickupPointId &&
    previousSelection?.destination?.id === rideRequest.destinationDongId &&
    isPoint(previousSelection.destination.point)
      ? previousSelection.destination.point
      : profile?.defaultDongId === rideRequest.destinationDongId &&
          isPoint(profile.defaultDropoff)
        ? profile.defaultDropoff
        : null;
  const usingDefaultDropoff = Boolean(point && point === profile?.defaultDropoff);
  const destination = {
    id: rideRequest.destinationDongId,
    name: rideRequest.destinationDongName ?? journey.destinationDongName,
    districtId: rideRequest.districtId,
    districtName: rideRequest.districtName,
    ...(point ? { point } : {}),
  };
  const selection = {
    isPreview: false,
    journeyId: journey.id,
    pickupPoint,
    destination,
    sameGenderOnly: rideRequest.sameGenderOnly,
    universityId: journey.universityId,
    universityName: journey.universityName,
  };
  const [travelOptions, pages] = await Promise.all([
    point
      ? optional(async () => {
          const result = await api.travelOptions({
            pickupPointId: pickupPoint.id,
            dropoff: point,
            departureAt: new Date(now).toISOString(),
          });
          if (result.data?.destinationDongId !== destination.id)
            throw new Error("하차 위치가 달라졌어요. 다시 선택해 주세요.");
          return result;
        }, "최신 교통 정보를 불러오지 못했어요. 잠시 후 다시 확인해 주세요.")
      : null,
    Promise.all(
      getSlotDates(new Date(now)).map((date) =>
        optional(
          () =>
            api.slots({
              pickupPointId: pickupPoint.id,
              destinationDongId: destination.id,
              sameGenderOnly: String(rideRequest.sameGenderOnly),
              date,
            }),
          "다음 출발 시간대를 불러오지 못했어요.",
        ),
      ),
    ),
  ]);
  if (pages.some((page) => page != null && !Array.isArray(page)))
    throw new Error("출발 시간대 응답을 확인할 수 없어요.");
  const matchingSlots = applySlotDeadlines(
    upcomingSlots(
      pages.flatMap((page) => page ?? []),
      now,
    ),
    now,
  );
  return {
    ...context,
    pickupPoint,
    selection,
    travelOptions,
    matchingSlots,
    nextSlot: matchingSlots.find(
      (slot) =>
        slot.registrationAllowed &&
        Date.parse(slot.departureAt) > Date.parse(rideRequest.departureAt),
    ),
    presentation: {
      directionLabel: rideRequest.districtName ?? journey.destinationDongName,
    },
    needsDestinationSelection: !point,
    usingDefaultDropoff,
    warnings: [...new Set(warnings)],
  };
}

export async function recordJourneyChoice(api, data, mode, key) {
  if (!canResolveFailure(data) || !["BUS", "SOLO"].includes(mode))
    throw new Error("최신 매칭 결과를 다시 확인해 주세요.");
  const { data: journey } = await api.chooseJourney(data.journey.id, mode, key);
  const expected = mode === "BUS" ? "BUS_SELECTED" : "SOLO_SELECTED";
  if (
    journey?.id !== data.journey.id ||
    journey.outcome !== expected ||
    journey.activeRequestId !== null
  )
    throw new Error(
      "귀가 방법 선택 결과를 확인하지 못했어요. 같은 선택으로 다시 시도해 주세요.",
    );
  return journey;
}
