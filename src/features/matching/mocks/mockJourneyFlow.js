import {
  defaultHomeData,
  homeScenarios,
} from "../../home/mocks/homeMockData.js";
import {
  mockMatchingResult,
  mockRepresentativeMatchingResult,
} from "./matchingMockData.js";
import { isPoint } from "../utils/mapUtils.js";

export const MOCK_MATCH_DELAY_MS = 10000;

export function scheduleMockMatching({
  id,
  status,
  enabled,
  store,
  schedule = setTimeout,
  cancel = clearTimeout,
}) {
  if (!enabled || !id || status !== "WAITING") return () => {};
  const timer = schedule(() => {
    const current = store.getState();
    if (
      current.journey?.home.rideRequest?.id === id &&
      current.journey.home.rideRequest.status === "WAITING"
    )
      current.match();
  }, MOCK_MATCH_DELAY_MS);
  return () => cancel(timer);
}

export function resolveMockPickup(session, pickupPoint) {
  if (
    !isPoint(pickupPoint?.point) ||
    session.home.pickupPoint?.id !== pickupPoint.id
  )
    return session;
  const updateParty = (party) =>
    party?.pickupPoint?.id === pickupPoint.id
      ? { ...party, pickupPoint }
      : party;
  return {
    ...session,
    home: {
      ...session.home,
      pickupPoint,
      party: updateParty(session.home.party),
    },
    registration:
      session.registration?.rideRequest?.pickupPointId === pickupPoint.id
        ? { ...session.registration, pickupPoint }
        : session.registration,
    matchingResult: session.matchingResult
      ? {
          ...session.matchingResult,
          party: updateParty(session.matchingResult.party),
        }
      : null,
  };
}

export function createMockJourney(
  role = "representative",
  scenario = "beforeLastTransit",
) {
  const home = structuredClone(homeScenarios[scenario] ?? defaultHomeData);
  return {
    role,
    home: {
      ...home,
      isPreview: true,
      previewNow: "2026-11-09T22:30:00+09:00",
      rideRequest: null,
      party: null,
    },
    registration: null,
    matchingResult: null,
    account: null,
  };
}

export function registerMockJourney(session, registration, selection) {
  const rideRequest = {
    ...registration.rideRequest,
    createdAt: session.home.previewNow,
  };
  return {
    ...session,
    registration: {
      ...registration,
      ...selection,
      rideRequest,
      isPreview: true,
    },
    home: {
      ...session.home,
      pickupPoint: selection.pickupPoint,
      rideRequest,
      party: null,
      travelOptions: {
        ...session.home.travelOptions,
        destinationDongId: rideRequest.destinationDongId,
        destinationDongName: rideRequest.destinationDongName,
        districtId: rideRequest.districtId,
        districtName: rideRequest.districtName,
      },
      matchingSlots: [registration.matchingSlot],
    },
    matchingResult: null,
    account: null,
  };
}

export function matchMockJourney(session) {
  if (session.home.rideRequest?.status !== "WAITING") return session;
  const source = structuredClone(
    session.role === "member"
      ? mockMatchingResult
      : mockRepresentativeMatchingResult,
  );
  const request = {
    ...session.home.rideRequest,
    status: "MATCHED",
    partyId: source.party.id,
  };
  const previewNow = new Date(
    Date.parse(request.departureAt) - 30 * 60000,
  ).toISOString();
  const party = {
    ...source.party,
    pickupPoint: session.home.pickupPoint,
    departureAt: request.departureAt,
    districtName: request.districtName,
    confirmDeadlineAt: new Date(
      Date.parse(previewNow) + 5 * 60000,
    ).toISOString(),
    members: source.party.members.map((member) => ({
      ...member,
      decision:
        member.memberId === source.party.myMemberId ? "PENDING" : "ACCEPTED",
      ...(member.memberId === source.party.myMemberId
        ? { destinationDongName: request.destinationDongName }
        : {}),
    })),
  };
  const matchingResult = {
    ...source,
    rideRequest: request,
    party,
    previewNow,
    isPreview: true,
    travelOptions: session.home.travelOptions,
  };
  return {
    ...session,
    matchingResult,
    registration: { ...session.registration, rideRequest: request },
    home: {
      ...session.home,
      rideRequest: request,
      party,
      matchedAt: previewNow,
      previewNow,
      mySettlementItem: source.settlement.items.find(
        (item) => item.memberId === party.myMemberId,
      ),
      settlement: source.settlement,
    },
  };
}

export function cancelMockJourney(session) {
  return {
    ...session,
    matchingResult: null,
    account: null,
    registration: null,
    home: { ...session.home, rideRequest: null, party: null },
  };
}

export function updateMockParty(session, party) {
  if (party.id !== session.matchingResult?.party.id) return session;
  return {
    ...session,
    home: { ...session.home, party },
    matchingResult: { ...session.matchingResult, party },
  };
}

export function prepayMockJourney(session) {
  if (!session.matchingResult) return session;
  const previewNow = session.matchingResult.party.departureAt;
  return {
    ...session,
    home: { ...session.home, previewNow },
    matchingResult: { ...session.matchingResult, previewNow },
  };
}

// 시연에서만 다른 멤버들의 입금 확인을 완료해 정산 화면까지 이어 준다.
export function receiveMockPrepayments(context) {
  const representativeId = context.party.representativeMemberId;
  return {
    ...context,
    settlement: {
      ...context.settlement,
      items: context.settlement.items.map((item) =>
        item.isRepresentative
          ? item
          : {
              ...item,
              transfers: [
                {
                  id: `demo-prepay-${item.id}`,
                  kind: "PREPAY",
                  settlementItemId: item.id,
                  payerMemberId: item.memberId,
                  payeeMemberId: representativeId,
                  amountWon: item.prepayDueWon,
                  status: "RECEIVED",
                },
              ],
            },
      ),
    },
  };
}

// 시연 전용 비례 배분. 실제 정산 계산은 서버 API를 따른다.
export function finalizeMockSettlement(context, amountWon, memberIds) {
  if (!Number.isSafeInteger(amountWon) || amountWon <= 0) return null;
  const received = receiveMockPrepayments(context);
  const original = received.settlement.items;
  const ordered = memberIds ?? original.map((item) => item.memberId);
  const total = original.reduce((sum, item) => sum + item.estimatedShareWon, 0);
  let assigned = 0;
  const items = ordered.map((memberId, index) => {
    const item = original.find((entry) => entry.memberId === memberId);
    const actualShareWon =
      index === ordered.length - 1
        ? amountWon - assigned
        : Math.floor((amountWon * original[index].estimatedShareWon) / total);
    assigned += actualShareWon;
    const refundDueWon = item.isRepresentative
      ? 0
      : item.prepayDueWon - actualShareWon;
    return {
      ...item,
      actualShareWon,
      refundDueWon,
      status: refundDueWon === 0 ? "COMPLETED" : "REFUND_PENDING",
      transfers: [
        ...item.transfers,
        ...(!item.isRepresentative && refundDueWon > 0
          ? [
              {
                id: `demo-refund-${item.id}`,
                kind: "REFUND",
                settlementItemId: item.id,
                payerMemberId: context.party.representativeMemberId,
                payeeMemberId: item.memberId,
                amountWon: refundDueWon,
                status: "PENDING",
              },
            ]
          : []),
      ],
    };
  });
  return {
    ...received.settlement,
    actualTotalWon: amountWon,
    items,
    status: "REFUNDING",
    finalizedAt: context.party.departureAt,
  };
}
