import test from "node:test";
import assert from "node:assert/strict";
import { representativeSettlementMock as finalized } from "../mocks/memberSettlementMock.js";
import {
  getFareInput,
  validateFarePreview,
  toFareRows,
  finalizeFare,
  fareErrorMessage,
  fareBlockingMessage,
} from "./fareFlow.js";

const party = {
  id: "401",
  myMemberId: "503",
  representativeMemberId: "503",
  routeVersion: 2,
  members: ["501", "502", "503"].map((memberId, index) => ({
    memberId,
    stopOrder: index + 1,
    destinationDongName: "영통동",
  })),
};
const settlement = {
  ...finalized,
  actualTotalWon: null,
  finalizedAt: null,
  status: "AWAITING_FARE",
  items: finalized.items.map((item) => ({
    ...item,
    actualShareWon: null,
    refundDueWon: null,
  })),
};
const context = { party, settlement, settlementEtag: '"settlement-v2"' };
const input = { actualTotalWon: 30000, routeVersion: 2 };
const preview = {
  ...input,
  canFinalize: true,
  blockingReasons: [],
  items: finalized.items.map(({ memberId, actualShareWon, refundDueWon }) => ({
    memberId,
    actualShareWon,
    refundDueWon,
  })),
};

test("금액은 양의 정수이며 본인 대표·팟·경로 버전·미확정 정산을 확인한다", () => {
  assert.deepEqual(getFareInput("30000", context), input);
  for (const amount of ["", "0", "-1", "1.5", "abc", "9007199254740992"])
    assert.equal(getFareInput(amount, context), null);
  for (const value of [
    { ...context, party: { ...party, myMemberId: "501" } },
    { ...context, party: { ...party, routeVersion: 3 } },
    { ...context, settlement: { ...settlement, partyId: "999" } },
    { ...context, settlement: finalized },
  ])
    assert.equal(getFareInput("30000", value), null);
});

test("미리보기 부담·차액은 API 값을 memberId로 연결하고 계산 전에는 이전 금액을 숨긴다", () => {
  validateFarePreview(preview, input, context);
  const rows = toFareRows(context, {
    ...preview,
    items: [...preview.items].reverse(),
  });
  assert.equal(rows[0].confirmed, "5,000원");
  assert.equal(rows[0].refund, "+400원");
  assert.equal(rows[0].received, "5,400원");
  assert.equal(rows[2].refund, "-");
  const pending = toFareRows(context, null);
  assert.equal(pending[0].confirmed, "-");
  assert.equal(pending[0].refund, "-");
  assert.equal(pending[0].received, "5,400원");
});

test("오래된 금액·경로, 다른 멤버, 중복, 잘못된 합계와 대표 환급은 거부한다", () => {
  for (const data of [
    { ...preview, actualTotalWon: 31000 },
    { ...preview, routeVersion: 3 },
    { ...preview, items: preview.items.slice(1) },
    {
      ...preview,
      items: [preview.items[0], preview.items[0], preview.items[2]],
    },
    {
      ...preview,
      items: preview.items.map((item, i) =>
        i ? item : { ...item, memberId: "999" },
      ),
    },
    {
      ...preview,
      items: preview.items.map((item, i) =>
        i ? item : { ...item, actualShareWon: 1 },
      ),
    },
    {
      ...preview,
      items: preview.items.map((item, i) =>
        i === 2 ? { ...item, refundDueWon: 100 } : item,
      ),
    },
    { ...preview, canFinalize: true, blockingReasons: ["UNKNOWN"] },
  ])
    assert.throws(() => validateFarePreview(data, input, context));
});

test("음수 차액은 서버 값대로 표시하고 확정 가능 여부는 canFinalize를 따른다", async () => {
  const blocked = {
    ...preview,
    canFinalize: false,
    blockingReasons: ["ADDITIONAL_PAYMENT_POLICY_REQUIRED"],
    items: preview.items.map((item, i) =>
      i ? item : { ...item, refundDueWon: -100 },
    ),
  };
  validateFarePreview(blocked, input, context);
  assert.equal(toFareRows(context, blocked)[0].refund, "-100원");
  assert.equal(toFareRows(context, blocked)[0].isAdditionalPayment, true);
  await assert.rejects(finalizeFare({}, context, input, blocked, "unused"));
  assert.match(fareBlockingMessage(blocked.blockingReasons), /추가 부담금/);
});

test("확정은 정산 ETag·동일 본문·멱등 키를 전송하고 서버 확정 응답만 반환한다", async () => {
  const result = await finalizeFare(
    {
      finalize: async (...args) => {
        assert.deepEqual(args, ["401", input, '"settlement-v2"', "same-key"]);
        return { data: finalized, etag: '"settlement-v3"' };
      },
    },
    context,
    input,
    preview,
    "same-key",
  );
  assert.equal(result.data, finalized);
  assert.equal(result.etag, '"settlement-v3"');
  await assert.rejects(
    finalizeFare(
      {},
      { ...context, settlementEtag: null },
      input,
      preview,
      "key",
    ),
  );
  for (const data of [
    settlement,
    { ...finalized, partyId: "999" },
    { ...finalized, id: "999" },
    { ...finalized, actualTotalWon: 31000 },
  ])
    await assert.rejects(
      finalizeFare(
        { finalize: async () => ({ data }) },
        context,
        input,
        preview,
        "key",
      ),
    );
});

test("경로 충돌·412·상한·미탑승 오류와 Retry-After 오류를 안내한다", () => {
  assert.match(fareErrorMessage({ status: 412 }), /최신 결과/);
  assert.match(fareErrorMessage({ code: "FARE_LIMIT_EXCEEDED" }), /1.2배/);
  assert.match(
    fareErrorMessage({ code: "ROUTE_VERSION_CONFLICT" }),
    /하차 순서/,
  );
  assert.match(fareErrorMessage({ code: "BOARDING_POLICY_REQUIRED" }), /탑승/);
  assert.match(fareErrorMessage({ status: 429 }), /잠시 후/);
});
