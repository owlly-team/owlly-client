export function getUserScopedData(state, userId) {
  return state && userId != null && state.userId === userId ? state : null;
}

export function selectSchoolPickupPoint(
  points,
  { universityId, selectedId, activeId },
) {
  const usable = points.filter(
    (point) =>
      point.universityId === null ||
      String(point.universityId) === String(universityId),
  );
  return (
    usable.find((point) => point.id === selectedId) ??
    usable.find((point) => point.id === activeId) ??
    usable.find(
      (point) => String(point.universityId) === String(universityId),
    ) ??
    null
  );
}

export async function loadHomePickupPoints(api, universityId) {
  if (!universityId) throw new Error("소속 학교 정보를 확인할 수 없어요.");
  const filtered = await api.pickupPoints(universityId);
  if (!Array.isArray(filtered.data))
    throw new Error("거점 목록을 확인할 수 없어요.");
  const allowed = (point) =>
    point.universityId === null ||
    String(point.universityId) === String(universityId);
  const points = filtered.data.filter(allowed);
  if (points.length)
    return { pickupPoints: points, pickupAvailability: "AVAILABLE" };
  // 필터 응답이 비었을 때만 전체 목록을 대조하며, 다른 학교 거점은 사용하지 않는다.
  const all = await api.pickupPoints();
  if (!Array.isArray(all.data))
    throw new Error("전체 거점 목록을 확인할 수 없어요.");
  const usable = all.data.filter(allowed);
  return {
    pickupPoints: usable,
    pickupAvailability: usable.length
      ? "FILTER_MISMATCH"
      : all.data.length
        ? "SCHOOL_EMPTY"
        : "ALL_EMPTY",
  };
}

// 페이지 순서에 의존하지 않고 현재 신청을 가진 귀가를 찾는다.
export async function loadCurrentRide(api) {
  const journeys = [];
  const visited = new Set();
  let cursor;
  do {
    const page = await api.journeys(cursor);
    if (!Array.isArray(page.data))
      throw new Error("귀가 내역을 확인할 수 없어요.");
    journeys.push(...page.data);
    if (!page.meta?.hasMore) break;
    cursor = page.meta.nextCursor;
    if (!cursor || visited.has(cursor))
      throw new Error("귀가 내역을 끝까지 확인하지 못했어요.");
    visited.add(cursor);
  } while (cursor);

  const candidates = journeys
    .filter((item) => item.activeRequestId)
    .sort(
      (a, b) =>
        Date.parse(b.intendedDepartureAt) - Date.parse(a.intendedDepartureAt),
    );
  for (const journey of candidates) {
    const { data: rideRequest } = await api.rideRequest(
      journey.activeRequestId,
    );
    if (
      rideRequest?.id !== journey.activeRequestId ||
      rideRequest.journeyId !== journey.id
    ) {
      throw new Error("귀가와 신청 정보가 일치하지 않아요.");
    }
    if (!["WAITING", "MATCHED"].includes(rideRequest.status)) continue;
    if (rideRequest.status === "WAITING")
      return { journey, rideRequest, party: null };
    if (!rideRequest.partyId)
      throw new Error("매칭된 팟 정보를 확인할 수 없어요.");
    const { data: party, etag: partyEtag } = await api.party(
      rideRequest.partyId,
    );
    if (party?.id !== rideRequest.partyId)
      throw new Error("팟 정보가 일치하지 않아요.");
    if (["CANCELLED", "COMPLETED"].includes(party.status)) continue;
    let settlement;
    let settlementError = null;
    try {
      settlement = (await api.settlement(party.id)).data;
      if (settlement?.partyId !== party.id)
        throw new Error("정산 정보가 일치하지 않아요.");
    } catch (error) {
      if (error.status === 401 || error.status === 403) throw error;
      if (error.code !== "SETTLEMENT_NOT_READY")
        settlementError = "예상 분담금을 불러오지 못했어요.";
      settlement = null;
    }
    return {
      journey,
      rideRequest,
      party,
      partyEtag,
      settlement,
      settlementError,
      mySettlementItem: settlement?.items?.find(
        (item) => item.memberId === party.myMemberId,
      ),
    };
  }
  return { journey: null, rideRequest: null, party: null };
}

export function getSlotDates(now = new Date()) {
  const date = (value) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(value);
  return [date(now), date(new Date(now.getTime() + 86400000))];
}

export function upcomingSlots(slots, now = Date.now()) {
  return slots
    .filter((slot) => Date.parse(slot.departureAt) > now)
    .sort((a, b) => Date.parse(a.departureAt) - Date.parse(b.departureAt));
}
