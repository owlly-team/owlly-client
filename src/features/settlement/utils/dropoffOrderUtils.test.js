import assert from "node:assert/strict";
import test from "node:test";
import { reorderDropoffMembers } from "./dropoffOrderUtils.js";

const rows = [
  {
    memberId: "501",
    name: "김*연",
    note: "첫 구간",
    confirmed: "5,000원",
    received: "5,400원",
    refund: "+400원",
  },
  {
    memberId: "507",
    name: "김*연",
    note: "두 번째 구간",
    confirmed: "6,000원",
    received: "7,000원",
    refund: "+1,000원",
  },
  {
    memberId: "502",
    name: "박*연",
    note: "세 번째 구간",
    confirmed: "8,750원",
    received: "9,500원",
    refund: "+750원",
  },
  {
    memberId: "503",
    name: "나 · 대표",
    note: "마지막 구간",
    confirmed: "16,250원",
    received: "-",
    refund: "-",
    isRepresentative: true,
  },
];

test("동명이인은 memberId로 구분하고 구간과 모든 금액은 순서 자리에 유지한다", () => {
  const original = structuredClone(rows);
  const next = reorderDropoffMembers(rows, ["502", "507", "501", "503"]);
  assert.deepEqual(
    next.map((row) => row.memberId),
    ["502", "507", "501", "503"],
  );
  assert.deepEqual(
    next.map((row) => row.name),
    ["박*연", "김*연", "김*연", "나 · 대표"],
  );
  next.forEach((row, index) => {
    for (const key of ["note", "confirmed", "received", "refund", "isRepresentative"])
      assert.equal(row[key], rows[index][key]);
  });
  assert.deepEqual(rows, original);
  assert.deepEqual(
    reorderDropoffMembers(
      next,
      rows.map((row) => row.memberId),
    ),
    rows,
  );
});

test("대표 이동, 중복·누락·다른 멤버 ID는 적용하지 않는다", () => {
  for (const order of [
    ["503", "507", "502", "501"],
    ["501", "501", "502", "503"],
    ["501", "507", "503"],
    ["999", "507", "502", "503"],
  ])
    assert.equal(reorderDropoffMembers(rows, order), rows);
});
