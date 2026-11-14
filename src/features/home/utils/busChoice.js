import { isPoint } from "../../matching/utils/mapUtils.js";

const isId = (value) =>
  typeof value === "string" && /^[1-9][0-9]*$/.test(value);
const sameTime = (a, b) =>
  Number.isFinite(Date.parse(a)) && Date.parse(a) === Date.parse(b);

export function createBusAttempt(context, now = Date.now()) {
  const transit = context.travelOptions?.transit;
  if (
    !isId(context.pickupPoint?.id) ||
    !isPoint(context.dropoff) ||
    !isId(context.travelOptions?.destinationDongId)
  )
    throw new Error("출발·하차 위치를 다시 확인해 주세요.");
  if (
    transit?.available !== true ||
    !Number.isFinite(Date.parse(transit.lastLeaveAt)) ||
    now > Date.parse(transit.lastLeaveAt)
  )
    throw new Error(
      "막차 출발 마감 시간이 지났어요. 귀가 방법을 다시 확인해 주세요.",
    );
  const key = crypto.randomUUID();
  const existing = context.journey;
  const journey =
    existing?.pickupPointId === context.pickupPoint.id &&
    existing.destinationDongId === context.travelOptions.destinationDongId
      ? existing
      : null;
  if (existing?.activeRequestId && !journey)
    throw Object.assign(
      new Error("진행 중인 동승이 있어요. 홈에서 등록 내용을 확인해 주세요."),
      { code: "ACTIVE_JOURNEY_CONFLICT" },
    );
  return {
    body: {
      clientJourneyKey: key,
      pickupPointId: context.pickupPoint.id,
      dropoff: { ...context.dropoff },
      intendedDepartureAt: new Date(now).toISOString(),
    },
    destinationDongId: context.travelOptions.destinationDongId,
    createKey: key,
    choiceKey: crypto.randomUUID(),
    journey,
  };
}

function validateJourney(journey, attempt) {
  if (
    !isId(journey?.id) ||
    journey.pickupPointId !== attempt.body.pickupPointId ||
    journey.destinationDongId !== attempt.destinationDongId ||
    (attempt.journey && journey.id !== attempt.journey.id)
  )
    throw new Error("귀가 응답의 출발·하차 정보가 일치하지 않아요.");
  return journey;
}

export async function submitBusChoice(api, attempt) {
  if (!attempt.journey) {
    const { data } = await api.createJourney(attempt.body, attempt.createKey);
    validateJourney(data, attempt);
    if (!sameTime(data.intendedDepartureAt, attempt.body.intendedDepartureAt))
      throw new Error("귀가 예정 시각이 일치하지 않아요.");
    attempt.journey = data;
  }
  const journey = validateJourney(attempt.journey, attempt);
  if (journey.outcome === "BUS_SELECTED") {
    if (journey.activeRequestId !== null)
      throw new Error("귀가 선택 결과를 확인할 수 없어요.");
    return journey;
  }
  if (journey.outcome !== "UNRESOLVED")
    throw Object.assign(
      new Error("이미 귀가 방법이 확정됐어요. 홈에서 다시 확인해 주세요."),
      { code: "JOURNEY_ALREADY_RESOLVED" },
    );
  const { data } = await api.chooseJourney(
    journey.id,
    "BUS",
    attempt.choiceKey,
  );
  validateJourney(data, attempt);
  if (
    data.outcome !== "BUS_SELECTED" ||
    data.activeRequestId !== null ||
    !sameTime(data.intendedDepartureAt, journey.intendedDepartureAt)
  )
    throw new Error("막차 선택 결과를 확인할 수 없어요. 다시 시도해 주세요.");
  return data;
}

export function busChoiceError(error) {
  return (
    {
      ACTIVE_JOURNEY_CONFLICT:
        "진행 중인 동승이 있어요. 홈에서 등록 내용을 확인해 주세요.",
      PARTY_LEAVE_REQUIRED: "매칭된 팟에서 먼저 나간 뒤 막차를 선택해 주세요.",
      JOURNEY_ALREADY_RESOLVED:
        "이미 귀가 방법이 확정됐어요. 홈에서 다시 확인해 주세요.",
      IDEMPOTENCY_CONFLICT:
        "귀가 요청 정보가 달라졌어요. 홈에서 다시 열어 주세요.",
      LOCATION_UNRESOLVABLE:
        "하차 위치를 확인할 수 없어요. 하차 지점을 다시 선택해 주세요.",
      UPSTREAM_UNAVAILABLE:
        "교통 정보를 확인할 수 없어요. 잠시 후 다시 시도해 주세요.",
    }[error.code] ??
    (error.status === 429
      ? "요청이 많아요. 잠시 후 다시 시도해 주세요."
      : error.message)
  );
}
