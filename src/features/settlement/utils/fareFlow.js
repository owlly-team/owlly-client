import {
  getSettlementIdentity,
  isFinalSettlement,
  isWon,
  toSettlementRows,
} from "./settlementUtils.js";

export function getFareInput(amount, context) {
  const { party, settlement } = context ?? {};
  const identity = getSettlementIdentity(settlement, party?.id, party);
  const actualTotalWon = /^\d+$/.test(String(amount)) ? Number(amount) : NaN;
  if (
    !identity?.mine.isRepresentative ||
    party.myMemberId !== party.representativeMemberId ||
    !isWon(actualTotalWon) ||
    actualTotalWon < 1 ||
    !Number.isSafeInteger(settlement.routeVersion) ||
    settlement.routeVersion < 1 ||
    settlement.finalizedAt != null
  )
    return null;
  return { actualTotalWon, routeVersion: settlement.routeVersion };
}

export function validateFarePreview(data, input, context) {
  const identity = getSettlementIdentity(
    context.settlement,
    context.party.id,
    context.party,
  );
  const members = new Set(identity?.items.map((item) => item.memberId));
  if (
    !identity?.mine.isRepresentative ||
    data?.actualTotalWon !== input.actualTotalWon ||
    data.routeVersion !== input.routeVersion ||
    typeof data.canFinalize !== "boolean" ||
    !Array.isArray(data.blockingReasons) ||
    data.blockingReasons.some((reason) => typeof reason !== "string") ||
    (data.canFinalize && data.blockingReasons.length > 0) ||
    !Array.isArray(data.items) ||
    data.items.length !== members.size ||
    new Set(data.items.map((item) => item?.memberId)).size !== members.size ||
    data.items.some(
      (item) =>
        !members.has(item?.memberId) ||
        !isWon(item.actualShareWon) ||
        !Number.isSafeInteger(item.refundDueWon) ||
        (item.memberId === context.party.representativeMemberId &&
          item.refundDueWon !== 0),
    ) ||
    data.items.reduce((sum, item) => sum + item.actualShareWon, 0) !==
      input.actualTotalWon
  )
    throw new Error("정산 계산 결과를 확인할 수 없어요.");
  return data;
}

export function toFareRows(context, preview) {
  if (!context?.settlement || !context.party) return [];
  const items = context.settlement.items.map((item) => {
    const calculated = preview?.items.find(
      (entry) => entry.memberId === item.memberId,
    );
    return {
      ...item,
      actualShareWon: calculated?.actualShareWon ?? null,
      refundDueWon: calculated?.refundDueWon ?? null,
    };
  });
  return toSettlementRows(
    { ...context.settlement, items },
    {
      partyId: context.party.id,
      party: context.party,
      final: true,
      receivedOnly: true,
    },
  );
}

export async function finalizeFare(api, context, input, preview, key) {
  validateFarePreview(preview, input, context);
  if (!preview.canFinalize)
    throw new Error("정산을 확정할 수 없어요. 안내 내용을 확인해 주세요.");
  const currentInput = getFareInput(input.actualTotalWon, context);
  if (!currentInput || currentInput.routeVersion !== input.routeVersion)
    throw new Error("최신 정산 정보를 확인해 주세요.");
  if (!context.settlementEtag)
    throw new Error("정산 버전을 확인할 수 없어요. 다시 불러와 주세요.");
  const response = await api.finalize(
    context.party.id,
    input,
    context.settlementEtag,
    key,
  );
  const identity = getSettlementIdentity(
    response.data,
    context.party.id,
    context.party,
  );
  if (
    !identity?.mine.isRepresentative ||
    response.data.id !== context.settlement.id ||
    !isFinalSettlement(response.data, context.party.id) ||
    response.data.actualTotalWon !== input.actualTotalWon ||
    response.data.routeVersion !== input.routeVersion ||
    identity.items.length !== preview.items.length ||
    identity.items.some(
      (item) =>
        !preview.items.some((entry) => entry.memberId === item.memberId),
    ) ||
    identity.items.reduce((sum, item) => sum + item.actualShareWon, 0) !==
      input.actualTotalWon
  )
    throw new Error(
      "정산 확정 결과를 확인할 수 없어요. 최신 정보를 확인해 주세요.",
    );
  return response;
}

const REASONS = {
  INVALID_STOP_ORDER: "현재 팟의 멤버를 빠짐없이 한 번씩 포함해 주세요.",
  REPRESENTATIVE_CHANGE_REQUIRES_POLICY: "대표는 마지막에 내려야 해요.",
  UPSTREAM_UNAVAILABLE: "경로 정보를 조회하지 못했어요. 잠시 후 다시 시도해 주세요.",
  FARE_LIMIT_EXCEEDED: "예상 전체 요금의 1.2배를 초과한 금액이에요.",
  ROUTE_VERSION_CONFLICT:
    "하차 순서가 변경됐어요. 최신 정보로 다시 계산해 주세요.",
  INVALID_ROUTE_DISTANCE: "경로 거리를 확인할 수 없어 정산을 계산할 수 없어요.",
  SETTLEMENT_FINALIZED: "이미 확정된 정산이에요.",
  PREPAY_NOT_COMPLETED: "서버에서 선입금 완료를 확인하지 못했어요.",
  ADDITIONAL_PAYMENT_POLICY_REQUIRED:
    "추가 부담금 처리에 대한 확인이 필요해요.",
  BOARDING_POLICY_REQUIRED:
    "미탑승 또는 탑승 여부가 확인되지 않은 멤버가 있어요.",
};

export function fareErrorMessage(error) {
  if ([412, 428].includes(error.status))
    return "정산 정보가 변경됐어요. 최신 결과를 확인한 뒤 다시 확정해 주세요.";
  if ([401, 403].includes(error.status))
    return "대표 계정의 로그인과 정산 권한을 확인해 주세요.";
  if (error.status === 429) return "요청이 많아요. 잠시 후 다시 시도해 주세요.";
  return REASONS[error.code] ?? error.message ?? "정산 요청에 실패했어요.";
}

export const fareBlockingMessage = (reasons) =>
  reasons
    .map(
      (reason) => REASONS[reason] ?? "정산 확정에 필요한 확인이 남아 있어요.",
    )
    .join(" ");
