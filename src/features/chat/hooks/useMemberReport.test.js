import test from "node:test";
import assert from "node:assert/strict";
import { getReportTargets } from "../utils/reportFlow.js";

test("report targets exclude the current member, including representative previews", () => {
  const members = ["501", "502", "503"].map((memberId) => ({ memberId }));
  assert.deepEqual(
    getReportTargets({ myMemberId: "503", members }).map(
      (member) => member.memberId,
    ),
    ["501", "502"],
  );
  assert.deepEqual(
    getReportTargets({ myMemberId: "502", members }).map(
      (member) => member.memberId,
    ),
    ["501", "503"],
  );
  assert.deepEqual(getReportTargets({ members }), []);
});
