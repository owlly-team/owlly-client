import test from "node:test";
import assert from "node:assert/strict";
import {
  toMatchingResultView,
  toRepresentativePayments,
} from "./utils/matchingResultUtils.js";
const party = {
  id: "401",
  myMemberId: "502",
  pickupPoint: { universityName: "단국대" },
  members: [
    {
      memberId: "503",
      universityName: "단국대",
      stopOrder: 3,
      decision: "PENDING",
    },
    {
      memberId: "502",
      universityName: "단국대",
      stopOrder: 2,
      decision: "PENDING",
    },
    {
      memberId: "501",
      universityName: "단국대",
      stopOrder: 1,
      decision: "ACCEPTED",
    },
    {
      memberId: "504",
      universityName: "다른 학교",
      stopOrder: null,
      decision: "LEFT",
    },
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
    ...party,
    representativeMemberId: "503",
    myMemberId: "503",
  };
  const allItems = {
    ...settlement,
    items: [
      { memberId: "501", estimatedShareWon: 4500, prepayDueWon: 5400 },
      { memberId: "502", estimatedShareWon: 7900, prepayDueWon: 9500 },
      { memberId: "503", estimatedShareWon: 7900, prepayDueWon: 0 },
      { memberId: "504", estimatedShareWon: 4500, prepayDueWon: 5400 },
    ],
  };
  assert.equal(
    toMatchingResultView(representative, allItems).isRepresentative,
    true,
  );
  assert.equal(
    toMatchingResultView({ ...representative, myMemberId: "502" }, allItems)
      .isRepresentative,
    false,
  );
  const view = toRepresentativePayments(representative, allItems);
  assert.equal(view.totalWon, 14900);
  assert.deepEqual(
    view.payments.map(({ member }) => member.memberId),
    ["501", "502"],
  );
  assert.equal(
    toRepresentativePayments(representative, settlement).totalWon,
    null,
  );
  assert.equal(toRepresentativePayments(representative, null).totalWon, null);
  assert.equal(
    toRepresentativePayments(representative, { ...allItems, partyId: "999" })
      .totalWon,
    null,
  );
});

test("selects own amount, counts companions and sorts only active members", () => {
  const view = toMatchingResultView(party, settlement);
  assert.equal(view.companionCount, 2);
  assert.equal(view.allSameSchool, true);
  assert.deepEqual(
    view.members.map((member) => member.memberId),
    ["501", "502", "503"],
  );
  assert.equal(view.mySettlementItem.prepayDueWon, 9500);
  const representative = toMatchingResultView(
    { ...party, myMemberId: "503" },
    settlement,
  );
  assert.equal(representative.mySettlementItem.prepayDueWon, 0);
  assert.equal(toMatchingResultView(party, null).mySettlementItem, undefined);
  assert.equal(
    toMatchingResultView(party, { ...settlement, partyId: "999" })
      .mySettlementItem,
    undefined,
  );
});

test("정산 항목의 이름과 거리는 memberId로 연결하며 다른 팟의 응답은 섞지 않는다", () => {
  const data = {
    ...settlement,
    items: [
      {
        memberId: "502",
        maskedName: "같*름",
        distanceMeters: 8500,
        isMe: true,
        isRepresentative: false,
        estimatedShareWon: 0,
        prepayDueWon: 0,
      },
      {
        memberId: "501",
        maskedName: "같*름",
        distanceMeters: 0,
        isMe: false,
        isRepresentative: false,
        estimatedShareWon: 5000,
        prepayDueWon: 6000,
      },
    ],
  };
  const view = toMatchingResultView(party, data);
  assert.equal(view.mySettlementItem.estimatedShareWon, 0);
  assert.deepEqual(
    view.members
      .slice(0, 2)
      .map((member) => [
        member.memberId,
        member.maskedName,
        member.distanceLabel,
      ]),
    [
      ["501", "같*름", "0km"],
      ["502", "같*름", "8.5km"],
    ],
  );
  assert.equal(
    toMatchingResultView(party, { ...data, partyId: "999" }).members[0]
      .distanceLabel,
    null,
  );
});

test("일반 멤버에게 본인 정산만 반환해도 전체 하차 목록은 API-22로 구성한다", () => {
  const data = {
    ...party,
    representativeMemberId: "503",
    districtName: "영통구",
    members: party.members.map((member) => ({
      ...member,
      maskedName: `멤버${member.memberId}`,
      destinationDongName: `${member.stopOrder}동`,
      isRepresentative: member.memberId === "502", // 배지는 ID가 기준이다.
    })),
  };
  const ownOnly = {
    partyId: "401",
    items: [
      {
        memberId: "502",
        maskedName: "정산이름",
        estimatedShareWon: 7900,
        prepayDueWon: 9500,
        distanceMeters: 8000,
        isMe: true,
        transfers: [],
      },
    ],
  };
  const view = toMatchingResultView(data, ownOnly);
  assert.equal(view.destinationLabel, "영통구");
  assert.equal(view.estimatedShareWon, 7900);
  assert.equal(view.prepayDueWon, 9500);
  assert.equal(view.amountsReady, true);
  assert.deepEqual(
    view.members.map((member) => [
      member.memberId,
      member.dropoffNote,
      member.isRepresentative,
    ]),
    [
      ["501", "1동에서 내려요", false],
      ["502", "2동에서 내려요", false],
      ["503", "3동에서 내려요", true],
    ],
  );
  assert.equal(view.members[1].maskedName, "멤버502");
  assert.equal(view.members[0].distanceLabel, null);
});

test("API-33의 0원은 유효하며 누락·음수·다른 경로 버전은 표시하지 않는다", () => {
  const data = { ...party, routeVersion: 2 };
  const money = (estimatedShareWon, prepayDueWon, routeVersion = 2) => ({
    partyId: "401",
    routeVersion,
    items: [{ memberId: "502", estimatedShareWon, prepayDueWon }],
  });
  const zero = toMatchingResultView(data, money(0, 0));
  assert.equal(zero.estimatedShareWon, 0);
  assert.equal(zero.prepayDueWon, 0);
  assert.equal(zero.amountsReady, true);
  for (const response of [
    null,
    money(undefined, undefined),
    money(-1, -1),
    money(7900, 9500, 1),
  ]) {
    const view = toMatchingResultView(data, response);
    assert.equal(view.estimatedShareWon, null);
    assert.equal(view.prepayDueWon, null);
    assert.equal(view.amountsReady, false);
    assert.equal(view.members.length, 3);
  }
});

test("하차 정보 누락은 undefined 문구를 만들지 않고 본인 하차 동으로 헤더를 구성한다", () => {
  const data = {
    ...party,
    members: party.members.map((member) => ({
      ...member,
      destinationDongName: member.memberId === "502" ? "영통2동" : undefined,
    })),
  };
  const view = toMatchingResultView(data, settlement);
  assert.equal(view.destinationLabel, "영통2동");
  assert.equal(view.members[0].dropoffNote, "하차 구역 확인 중");
});

test("대표 합계는 같은 경로의 참여 멤버 정산만 사용한다", () => {
  const data = {
    ...party,
    myMemberId: "503",
    representativeMemberId: "503",
    routeVersion: 2,
  };
  const response = {
    partyId: "401",
    routeVersion: 2,
    items: [
      { memberId: "501", estimatedShareWon: 7900, prepayDueWon: 9500 },
      { memberId: "502", estimatedShareWon: 7900, prepayDueWon: 9500 },
      { memberId: "503", estimatedShareWon: 7900, prepayDueWon: 0 },
      { memberId: "504", estimatedShareWon: 7900, prepayDueWon: 9500 },
    ],
  };
  assert.equal(toRepresentativePayments(data, response).totalWon, 19000);
  assert.equal(
    toRepresentativePayments(data, { ...response, routeVersion: 1 }).totalWon,
    null,
  );
});
