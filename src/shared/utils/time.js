// 서버가 준 출발 시각과 비교할 기준 시각. 고정 시계는 명시적 미리보기에서만 허용한다.
export function getDisplayNow(data, now = Date.now()) {
  const preview =
    data?.isPreview === true
      ? typeof data.previewNow === "number"
        ? data.previewNow
        : Date.parse(data.previewNow)
      : NaN;
  return Number.isFinite(preview) ? preview : now;
}

export function applySlotDeadlines(slots, now = Date.now()) {
  return slots
    .filter((slot) => Date.parse(slot.departureAt) > now)
    .map((slot) =>
      slot.registrationAllowed === true &&
      now > Date.parse(slot.departureAt) - 15 * 60000
        ? { ...slot, registrationAllowed: false, reason: "REGISTRATION_CLOSED" }
        : slot,
    );
}

