const validId = (value) => /^[1-9][0-9]*$/.test(value ?? "");
const storageKey = "owlly:last-ride-requests";

// 새로고침 복구에 필요한 ID만 탭에 보관한다. 좌표·성별·응답 본문은 저장하지 않는다.
export function createRideRequestIndex(
  storage = () => globalThis.sessionStorage,
) {
  let userId = null;
  let records = {};
  function persist() {
    try {
      storage()?.setItem(storageKey, JSON.stringify({ userId, records }));
    } catch {
      /* 저장 차단 시 메모리만 사용 */
    }
  }
  function activate(id) {
    const next = id == null ? null : String(id);
    if (next === userId) return;
    userId = next;
    records = {};
    try {
      const saved = JSON.parse(storage()?.getItem(storageKey) ?? "null");
      if (saved?.userId === userId) {
        for (const record of Object.values(saved.records ?? {})) {
          if (validId(record?.journeyId) && validId(record?.requestId))
            records[record.journeyId] = record;
        }
      }
    } catch {
      /* 손상된 저장값은 무시 */
    }
    persist();
  }
  function remember(id, request, replace = false) {
    if (
      userId == null ||
      String(id) !== userId ||
      !validId(request?.id) ||
      !validId(request?.journeyId)
    )
      return;
    const journeyId = String(request.journeyId);
    const previous = records[journeyId];
    if (
      !replace &&
      previous &&
      previous.requestId !== String(request.id) &&
      !(Date.parse(request.createdAt) > Date.parse(previous.createdAt))
    )
      return;
    records[journeyId] = {
      journeyId,
      requestId: String(request.id),
      createdAt: request.createdAt,
    };
    persist();
  }
  return {
    activate,
    remember,
    list: (id) =>
      userId != null && String(id) === userId ? Object.values(records) : [],
    clear: () => {
      userId = null;
      records = {};
      try {
        storage()?.removeItem(storageKey);
      } catch {
        /* 저장 차단 */
      }
    },
  };
}

export const rideRequestIndex = createRideRequestIndex();
