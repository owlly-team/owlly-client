import { isPoint } from "./mapUtils.js";

export function normalizeMatchingIds(value, key = "") {
  if (value == null) return value;
  if (Array.isArray(value))
    return value.map((item) =>
      normalizeMatchingIds(item, key.endsWith("Ids") ? "id" : ""),
    );
  if (typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([name, item]) => [
        name,
        normalizeMatchingIds(item, name),
      ]),
    );
  if (key === "id" || key.endsWith("Id")) {
    if (typeof value === "number" && !Number.isSafeInteger(value))
      throw new Error("정확한 ID를 확인할 수 없어요.");
    return String(value);
  }
  return value;
}

export function registrationFingerprint(selection, slot) {
  return JSON.stringify([
    selection.pickupPoint.id,
    selection.destination.point,
    slot.departureAt,
    selection.sameGenderOnly,
    selection.journeyId ?? null,
  ]);
}

export function createRegistrationAttempt(
  selection,
  slot,
  uuid = () => crypto.randomUUID(),
) {
  if (
    !/^[1-9][0-9]*$/.test(selection.pickupPoint?.id ?? "") ||
    !isPoint(selection.destination?.point) ||
    !slot.registrationAllowed ||
    !Number.isFinite(Date.parse(slot.departureAt)) ||
    typeof selection.sameGenderOnly !== "boolean"
  ) {
    throw new Error("출발 거점·하차 위치·출발 시간을 다시 확인해 주세요.");
  }
  return {
    fingerprint: registrationFingerprint(selection, slot),
    journeyId: selection.journeyId ?? null,
    journeyKey: uuid(),
    requestKey: uuid(),
    journeyBody: {
      clientJourneyKey: uuid(),
      pickupPointId: String(selection.pickupPoint.id),
      dropoff: { ...selection.destination.point },
      intendedDepartureAt: slot.departureAt,
    },
    requestBody: {
      clientRequestKey: uuid(),
      pickupPointId: String(selection.pickupPoint.id),
      dropoff: { ...selection.destination.point },
      departureAt: slot.departureAt,
      sameGenderOnly: selection.sameGenderOnly,
    },
  };
}

export async function submitRegistration(api, attempt) {
  if (!attempt.journeyId) {
    const { data: journey } = await api.createJourney(
      attempt.journeyBody,
      attempt.journeyKey,
    );
    if (
      !/^[1-9][0-9]*$/.test(journey?.id ?? "") ||
      String(journey.pickupPointId) !== attempt.journeyBody.pickupPointId ||
      Date.parse(journey.intendedDepartureAt) !==
        Date.parse(attempt.journeyBody.intendedDepartureAt)
    ) {
      throw new Error(
        "생성된 귀가 정보를 확인할 수 없어요. 같은 요청으로 다시 시도해 주세요.",
      );
    }
    attempt.journeyId = String(journey.id);
  }
  const { data: rideRequest } = await api.createRideRequest(
    attempt.journeyId,
    attempt.requestBody,
    attempt.requestKey,
  );
  if (
    !/^[1-9][0-9]*$/.test(rideRequest?.id ?? "") ||
    String(rideRequest.journeyId) !== attempt.journeyId ||
    String(rideRequest.pickupPointId) !== attempt.requestBody.pickupPointId ||
    Date.parse(rideRequest.departureAt) !==
      Date.parse(attempt.requestBody.departureAt) ||
    rideRequest.sameGenderOnly !== attempt.requestBody.sameGenderOnly
  ) {
    throw new Error(
      "등록 응답이 선택한 신청과 일치하지 않아요. 같은 요청으로 다시 확인해 주세요.",
    );
  }
  return rideRequest;
}
