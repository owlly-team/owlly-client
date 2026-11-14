import test from "node:test";
import assert from "node:assert/strict";
import { getSettlementRefreshKey } from "./settlementLifecycle.js";
import { memberSettlementMock } from "../mocks/memberSettlementMock.js";
import { toMemberSettlementView } from "./memberSettlementUtils.js";

test("팟/경로/탑승·집결 단계가 바뀌면 API-33 재조회 기준이 바뀐다", () => {
  const party = {
    id: "401",
    status: "CONFIRMING",
    routeVersion: 1,
    myMemberId: "502",
    members: [
      { memberId: "502", decision: "PENDING", boardingStatus: "UNKNOWN" },
    ],
  };
  const key = getSettlementRefreshKey(party, "chat");
  assert.equal(getSettlementRefreshKey({ ...party }, "chat"), key);
  for (const updated of [
    { ...party, status: "PREPAYING" },
    { ...party, status: "SETTLING" },
    { ...party, routeVersion: 2 },
    { ...party, members: [{ ...party.members[0], decision: "ACCEPTED" }] },
  ])
    assert.notEqual(getSettlementRefreshKey(updated, "chat"), key);
  assert.notEqual(getSettlementRefreshKey(party, "prepay"), key);
});

test("최종 API-33 본인 항목만 있어도 대표 ID는 API-22에서 찾아 본인 최종 정산을 표시한다", () => {
  const data = {
    ...memberSettlementMock,
    items: memberSettlementMock.items.filter((item) => item.isMe),
  };
  const party = {
    id: "401",
    routeVersion: data.routeVersion,
    myMemberId: "502",
    representativeMemberId: "503",
    members: [{ memberId: "502" }, { memberId: "503", maskedName: "대표" }],
  };
  const view = toMemberSettlementView(data, "401", { party });
  assert.equal(view.paid, "9,500원");
  assert.equal(view.amount, "750원");
  assert.equal(view.rows.length, 1);
  assert.equal(view.representativeName, "대표");
  assert.equal(
    toMemberSettlementView({ ...data, status: "ESTIMATED" }, "401", { party }),
    null,
  );
  assert.equal(
    toMemberSettlementView({ ...data, finalizedAt: null }, "401", { party }),
    null,
  );
  assert.equal(
    toMemberSettlementView(data, "401", {
      party: { ...party, routeVersion: 99 },
    }),
    null,
  );
});
