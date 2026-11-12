import test from "node:test";
import assert from "node:assert/strict";
import { toMatchingResultView, toRepresentativePayments } from "./utils/matchingResultUtils.js";
const party = {
  id: "401", myMemberId: "502", pickupPoint: { universityName: "단국대" },
  members: [
    { memberId: "503", universityName: "단국대", stopOrder: 3, decision: "PENDING" },
    { memberId: "502", universityName: "단국대", stopOrder: 2, decision: "PENDING" },
    { memberId: "501", universityName: "단국대", stopOrder: 1, decision: "ACCEPTED" },
    { memberId: "504", universityName: "다른 학교", stopOrder: null, decision: "LEFT" },
  ],
};
const settlement = {
  partyId: "401",
  items: [
    { memberId: "503", estimatedShareWon: 9000, prepayDueWon: 0 },
    { memberId: "502", estimatedShareWon: 7900, prepayDueWon: 9500 },
  ],
};
test("representative is determined by party IDs, and receives other members' prepayments", () => {
  const representative = {
    ...party, representativeMemberId: "503", myMemberId: "503",
  };
  const allItems = { ...settlement, items: [
    { memberId: "501", estimatedShareWon: 4500, prepayDueWon: 5400 },
    { memberId: "502", estimatedShareWon: 7900, prepayDueWon: 9500 },
    { memberId: "503", estimatedShareWon: 7900, prepayDueWon: 0 },
    { memberId: "504", estimatedShareWon: 4500, prepayDueWon: 5400 },
  ] };
  assert.equal(toMatchingResultView(representative, allItems).isRepresentative, true);
  assert.equal(toMatchingResultView({ ...representative, myMemberId: "502" }, allItems).isRepresentative, false);
  const view = toRepresentativePayments(representative, allItems);
  assert.equal(view.totalWon, 14900);
  assert.deepEqual(view.payments.map(({ member }) => member.memberId), ["501", "502"]);
  assert.equal(toRepresentativePayments(representative, settlement).totalWon, null);
  assert.equal(toRepresentativePayments(representative, null).totalWon, null);
  assert.equal(toRepresentativePayments(representative, { ...allItems, partyId: "999" }).totalWon, null);
});

test("selects own amount, counts companions and sorts only active members", () => {
  const view = toMatchingResultView(party, settlement);
  assert.equal(view.companionCount, 2);
  assert.equal(view.allSameSchool, true);
  assert.deepEqual(view.members.map((member) => member.memberId), ["501", "502", "503"]);
  assert.equal(view.mySettlementItem.prepayDueWon, 9500);
  const representative = toMatchingResultView({ ...party, myMemberId: "503" }, settlement);
  assert.equal(representative.mySettlementItem.prepayDueWon, 0);
  assert.equal(toMatchingResultView(party, null).mySettlementItem, undefined);
  assert.equal(toMatchingResultView(party, { ...settlement, partyId: "999" }).mySettlementItem, undefined);
});

test("정산 항목의 이름과 거리는 memberId로 연결하며 다른 팟의 응답은 섞지 않는다", () => {
  const data = { ...settlement, items: [
    { memberId: "502", maskedName: "같*름", distanceMeters: 8500, isMe: true, isRepresentative: false, estimatedShareWon: 0, prepayDueWon: 0 },
    { memberId: "501", maskedName: "같*름", distanceMeters: 0, isMe: false, isRepresentative: false, estimatedShareWon: 5000, prepayDueWon: 6000 },
  ] };
  const view = toMatchingResultView(party, data);
  assert.equal(view.mySettlementItem.estimatedShareWon, 0);
  assert.deepEqual(view.members.slice(0, 2).map((member) => [member.memberId, member.maskedName, member.distanceLabel]),
    [["501", "같*름", "0km"], ["502", "같*름", "8.5km"]]);
  assert.equal(toMatchingResultView(party, { ...data, partyId: "999" }).members[0].distanceLabel, null);
});
