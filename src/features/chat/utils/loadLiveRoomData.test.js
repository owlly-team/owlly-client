import test from "node:test";
import assert from "node:assert/strict";
import { loadLiveRoomData } from "./loadLiveRoomData.js";

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
const party = {
  id: "401",
  roomId: "601",
  myMemberId: "502",
  members: [{ memberId: "502", decision: "ACCEPTED" }],
};
const room = {
  id: "601",
  partyId: "401",
  status: "OPEN",
  verificationCode: "0042",
};
const base = { party: async () => ({ data: party, etag: '"p1"' }) };

test("chat opens only after room authorization and does not wait for settlement", async () => {
  const access = deferred(),
    money = deferred(),
    painted = deferred();
  const updates = [];
  const done = loadLiveRoomData(
    { ...base, room: () => access.promise, settlement: () => money.promise },
    "401",
    "601",
    {
      onUpdate: (data) => {
        updates.push(data);
        painted.resolve();
      },
    },
  );
  await Promise.resolve();
  assert.equal(updates.length, 0);
  access.resolve({ data: room });
  await painted.promise;
  assert.equal(updates[0].room.verificationCode, "0042");
  assert.equal(updates[0].context.settlement, null);
  assert.equal(updates[0].context.settlementLoading, true);
  money.resolve({
    data: { partyId: "401", routeVersion: 1, items: [] },
    etag: '"s1"',
  });
  const result = await done;
  assert.equal(result.context.settlementLoading, false);
  assert.equal(result.context.settlementEtag, '"s1"');
});

test("room denial or settlement authorization failure cannot publish access later", async () => {
  for (const failureIn of ["room", "settlement"]) {
    const other = deferred(),
      failed = deferred();
    const updates = [];
    const done = loadLiveRoomData(
      {
        ...base,
        room: () => (failureIn === "room" ? failed.promise : other.promise),
        settlement: () =>
          failureIn === "settlement" ? failed.promise : other.promise,
      },
      "401",
      "601",
      { onUpdate: (data) => updates.push(data) },
    );
    const rejected = assert.rejects(done, { status: 403 });
    failed.reject(Object.assign(new Error("denied"), { status: 403 }));
    await rejected;
    other.resolve({
      data: failureIn === "room" ? { partyId: "401", items: [] } : room,
    });
    await other.promise;
    await Promise.resolve();
    assert.equal(updates.length, 0);
  }
});

test("missing optional settlement keeps verified chat usable and cancellation suppresses late data", async () => {
  const result = await loadLiveRoomData(
    {
      ...base,
      room: async () => ({ data: room }),
      settlement: async () => {
        throw Object.assign(new Error("not yet"), {
          code: "SETTLEMENT_NOT_READY",
        });
      },
    },
    "401",
    "601",
  );
  assert.equal(result.context.settlementNotReady, true);
  assert.equal(result.room.id, "601");
  const controller = new AbortController(),
    money = deferred(),
    painted = deferred();
  const updates = [];
  const done = loadLiveRoomData(
    {
      ...base,
      room: async () => ({ data: room }),
      settlement: () => money.promise,
    },
    "401",
    "601",
    {
      signal: controller.signal,
      onUpdate: (data) => {
        updates.push(data);
        painted.resolve();
      },
    },
  );
  await painted.promise;
  controller.abort();
  const rejected = assert.rejects(done, { name: "AbortError" });
  money.resolve({ data: { partyId: "401", items: [] } });
  await rejected;
  assert.equal(updates.length, 1);
});
