import test from "node:test";
import assert from "node:assert/strict";
import { applySlotDeadlines, getDisplayNow } from "./time.js";

test("03:37 KST starts at tonight 22:00 and distinguishes tomorrow's midnight", () => {
  const now = Date.parse("2026-11-14T03:37:00+09:00");
  const slots = [
    "2026-11-14T00:00:00+09:00",
    "2026-11-14T02:00:00+09:00",
    "2026-11-14T22:00:00+09:00",
    "2026-11-14T23:30:00+09:00",
    "2026-11-15T00:00:00+09:00",
  ].map((departureAt) => ({
    departureAt,
    registrationAllowed: true,
    waitingCount: 0,
  }));
  const available = applySlotDeadlines(slots, now);
  assert.deepEqual(
    available.map((slot) => slot.departureAt),
    slots.slice(2).map((slot) => slot.departureAt),
  );
  assert.equal(available[0].waitingCount, 0);
});

test("live and unspecified contexts ignore a leaked mock clock", () => {
  const now = Date.parse("2026-11-14T23:00:00+09:00");
  assert.equal(
    getDisplayNow(
      { isPreview: false, previewNow: "2026-11-05T23:30:00+09:00" },
      now,
    ),
    now,
  );
  assert.equal(
    getDisplayNow({ previewNow: "2026-11-05T23:30:00+09:00" }, now),
    now,
  );
});

test("only explicit previews use a valid fixed clock; invalid dates use the real clock", () => {
  const previewNow = "2026-11-05T23:30:00+09:00";
  assert.equal(
    getDisplayNow({ isPreview: true, previewNow }, 0),
    Date.parse(previewNow),
  );
  assert.equal(
    getDisplayNow({ isPreview: true, previewNow: "invalid" }, 1234),
    1234,
  );
  assert.equal(getDisplayNow({}, 0), 0);
  assert.equal(getDisplayNow({ isPreview: true, previewNow: 0 }, 1234), 0);
});

test("live slot selection closes at the current 15-minute boundary without overriding server restrictions", () => {
  const slot = {
    departureAt: "2026-11-14T23:30:00+09:00",
    registrationAllowed: true,
    waitingCount: 0,
  };
  const cutoff = Date.parse("2026-11-14T14:15:00Z");
  assert.equal(applySlotDeadlines([slot], cutoff)[0].registrationAllowed, true);
  assert.equal(
    applySlotDeadlines([slot], cutoff + 1)[0].registrationAllowed,
    false,
  );
  assert.equal(applySlotDeadlines([slot], cutoff + 1)[0].waitingCount, 0);
  const blocked = {
    ...slot,
    registrationAllowed: false,
    reason: "SERVER_POLICY",
  };
  assert.equal(applySlotDeadlines([blocked], cutoff - 1)[0], blocked);
  assert.deepEqual(
    applySlotDeadlines([slot], Date.parse(slot.departureAt)),
    [],
  );
});
