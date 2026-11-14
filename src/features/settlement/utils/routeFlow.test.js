import test from "node:test";
import assert from "node:assert/strict";
import { representativeSettlementMock } from "../mocks/memberSettlementMock.js";
import { getRoutePatch, updateSettlementRoute } from "./routeFlow.js";
import {
  getFareInput,
  toFareRows,
  validateFarePreview,
  finalizeFare,
} from "./fareFlow.js";

const settlement = {
  ...representativeSettlementMock,
  actualTotalWon: null,
  finalizedAt: null,
  status: "AWAITING_FARE",
  items: representativeSettlementMock.items.map((item) => ({
    ...item,
    actualShareWon: null,
    refundDueWon: null,
  })),
};
const party = {
  id: "401",
  myMemberId: "503",
  representativeMemberId: "503",
  routeVersion: 2,
  members: settlement.items.map((item, index) => ({
    memberId: item.memberId,
    stopOrder: index + 1,
  })),
};
const context = {
  party,
  settlement,
  settlementEtag: '"s2"',
  partyEtag: '"p2"',
};
const ids = ["502", "501", "503"];
const updated = {
  ...settlement,
  routeVersion: 3,
  items: settlement.items.map((item) => ({ ...item, distanceMeters: 7000 })),
};

test("순서 수정은 현재 계산 대상 전원과 대표 마지막을 확인하며 ID와 경로 버전만 보낸다", () => {
  assert.deepEqual(getRoutePatch(context, ids), {
    orderedMemberIds: ids,
    expectedRouteVersion: 2,
  });
  for (const order of [
    ["501", "503"],
    ["501", "501", "503"],
    ["501", "999", "503"],
    [501, "502", "503"],
    ["503", "502", "501"],
  ])
    assert.throws(() => getRoutePatch(context, order));
  for (const bad of [
    { ...context, party: { ...party, myMemberId: "501" } },
    { ...context, party: { ...party, routeVersion: 1 } },
    {
      ...context,
      settlement: { ...settlement, finalizedAt: "2026-11-14T00:00:00Z" },
    },
  ])
    assert.throws(() => getRoutePatch(bad, ids));
});

test("저장 성공 후 서버 거리·새 정산 ETag·요청 순서를 반영하고 새 버전으로 재계산·확정한다", async () => {
  const result = await updateSettlementRoute(
    {
      updateRoute: async (...args) => {
        assert.deepEqual(args, [
          "401",
          { orderedMemberIds: ids, expectedRouteVersion: 2 },
          '"s2"',
          "route-key",
        ]);
        return { data: updated, etag: '"s3"' };
      },
    },
    context,
    ids,
    "route-key",
  );
  assert.equal(result.settlement, updated);
  assert.equal(result.settlementEtag, '"s3"');
  assert.equal(result.partyEtag, undefined);
  const body = getFareInput("30000", result);
  assert.deepEqual(body, { actualTotalWon: 30000, routeVersion: 3 });
  const calculated = {
    ...body,
    canFinalize: true,
    blockingReasons: [],
    items: representativeSettlementMock.items.map(
      ({ memberId, actualShareWon, refundDueWon }) => ({
        memberId,
        actualShareWon,
        refundDueWon,
      }),
    ),
  };
  validateFarePreview(calculated, body, result);
  assert.deepEqual(
    toFareRows(result, calculated).map((row) => row.memberId),
    ids,
  );
  assert.match(toFareRows(result, calculated)[0].note, /7km/);
  assert.equal(toFareRows(result, calculated)[0].received, "9,500원");
  await finalizeFare(
    {
      finalize: async (...args) => {
        assert.deepEqual(args, ["401", body, '"s3"', "final-key"]);
        return {
          data: { ...representativeSettlementMock, routeVersion: 3 },
          etag: '"s4"',
        };
      },
    },
    result,
    body,
    calculated,
    "final-key",
  );
  assert.throws(() =>
    validateFarePreview({ ...calculated, routeVersion: 2 }, body, result),
  );
});

test("다른 팟·정산·버전·멤버 및 선입금액 변경 응답을 성공으로 처리하지 않는다", async () => {
  const alteredTransfers = updated.items.map((item, index) =>
    index
      ? item
      : {
          ...item,
          transfers: item.transfers.map((transfer) => ({
            ...transfer,
            amountWon: 1,
          })),
        },
  );
  for (const data of [
    { ...updated, partyId: "999" },
    { ...updated, id: "999" },
    { ...updated, routeVersion: 2 },
    { ...updated, finalizedAt: "2026-11-14T00:00:00Z" },
    { ...updated, items: updated.items.slice(1) },
    { ...updated, items: alteredTransfers },
  ])
    await assert.rejects(
      updateSettlementRoute(
        { updateRoute: async () => ({ data, etag: '"s3"' }) },
        context,
        ids,
        "key",
      ),
    );
  await assert.rejects(
    updateSettlementRoute({}, { ...context, settlementEtag: null }, ids, "key"),
  );
});
