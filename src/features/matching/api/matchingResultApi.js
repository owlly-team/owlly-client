async function getResource(path, { baseUrl = "", signal, fetcher = fetch } = {}) {
  const response = await fetcher(`${baseUrl.replace(/\/$/, "")}${path}`, {
    credentials: "include",
    signal,
  });
  const body = await response.json();
  if (!response.ok) {
    const error = new Error("매칭 정보를 불러오지 못했어요.");
    error.status = response.status;
    error.code = body.error?.code;
    throw error;
  }
  return body.data;
}

export async function loadMatchingResult(partyId, options) {
  if (!/^[1-9][0-9]*$/.test(partyId)) throw new Error("올바르지 않은 팟 ID예요.");
  const path = `/api/v1/parties/${partyId}`;
  const [partyResult, settlementResult] = await Promise.allSettled([
    getResource(path, options),
    getResource(`${path}/settlement`, options),
  ]);
  if (partyResult.status === "rejected") throw partyResult.reason;
  const party = partyResult.value;
  if (party?.id !== partyId) throw new Error("팟 정보가 일치하지 않아요.");
  if (settlementResult.status === "fulfilled") {
    if (settlementResult.value?.partyId !== partyId) throw new Error("정산 정보가 일치하지 않아요.");
    return { party, settlement: settlementResult.value };
  }
  const error = settlementResult.reason;
  return {
    party,
    settlement: null,
    settlementNotReady: error.status === 409 && error.code === "SETTLEMENT_NOT_READY",
    settlementError: !(error.status === 409 && error.code === "SETTLEMENT_NOT_READY"),
  };
}
