import { getSettlementIdentity, getPrepaidWon } from "./settlementUtils.js";

export function getRoutePatch(context, orderedMemberIds) {
  const { party, settlement } = context;
  const identity = getSettlementIdentity(settlement, party?.id, party);
  if (
    !identity?.mine.isRepresentative ||
    party.myMemberId !== party.representativeMemberId ||
    settlement.finalizedAt != null ||
    !Number.isSafeInteger(settlement.routeVersion) ||
    settlement.routeVersion < 1 ||
    !Array.isArray(orderedMemberIds) ||
    orderedMemberIds.length < 2 ||
    orderedMemberIds.length > 4 ||
    orderedMemberIds.length !== identity.items.length ||
    new Set(orderedMemberIds).size !== orderedMemberIds.length ||
    orderedMemberIds.some(
      (id) =>
        typeof id !== "string" ||
        !/^[1-9][0-9]*$/.test(id) ||
        !identity.items.some((item) => item.memberId === id),
    )
  )
    throw new Error("하차 순서의 멤버와 최신 정산 정보를 확인해 주세요.");
  if (orderedMemberIds.at(-1) !== party.representativeMemberId)
    throw Object.assign(new Error("대표는 마지막에 내려야 해요."), {
      code: "REPRESENTATIVE_CHANGE_REQUIRES_POLICY",
    });
  return {
    orderedMemberIds: [...orderedMemberIds],
    expectedRouteVersion: settlement.routeVersion,
  };
}

export async function updateSettlementRoute(
  api,
  context,
  orderedMemberIds,
  key,
) {
  const input = getRoutePatch(context, orderedMemberIds);
  if (!context.settlementEtag)
    throw new Error("정산 버전을 확인할 수 없어요. 다시 불러와 주세요.");
  const response = await api.updateRoute(
    context.party.id,
    input,
    context.settlementEtag,
    key,
  );
  const { data } = response;
  // 성공한 순서만 반영한다. 거리·요금은 API-36 응답을 사용한다.
  const party = {
    ...context.party,
    routeVersion: data?.routeVersion,
    members: context.party.members.map((member) => {
      const index = orderedMemberIds.indexOf(member.memberId);
      return index < 0 ? member : { ...member, stopOrder: index + 1 };
    }),
  };
  const identity = getSettlementIdentity(data, party.id, party);
  if (
    !identity?.mine.isRepresentative ||
    data.id !== context.settlement.id ||
    !Number.isSafeInteger(data.routeVersion) ||
    data.routeVersion <= input.expectedRouteVersion ||
    data.finalizedAt != null ||
    !response.etag ||
    identity.items.length !== orderedMemberIds.length ||
    identity.items.some(
      (item) =>
        !orderedMemberIds.includes(item.memberId) ||
        getPrepaidWon(item, party.representativeMemberId, true) !==
          getPrepaidWon(
            context.settlement.items.find(
              (previous) => previous.memberId === item.memberId,
            ),
            party.representativeMemberId,
            true,
          ),
    )
  )
    throw new Error(
      "하차 순서 저장 결과를 확인할 수 없어요. 최신 정보를 다시 확인해 주세요.",
    );
  return {
    ...context,
    party,
    partyEtag: undefined,
    settlement: data,
    settlementEtag: response.etag,
  };
}
