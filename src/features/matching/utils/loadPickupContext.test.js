import test from "node:test";
import assert from "node:assert/strict";
import { loadPickupContext } from "./loadPickupContext.js";

test("known school loads profile and points in parallel and exposes verified profile first", async () => {
  let resolveProfile, resolvePoints;
  const calls = [],
    profiles = [];
  const profile = new Promise((resolve) => {
    resolveProfile = resolve;
  });
  const points = new Promise((resolve) => {
    resolvePoints = resolve;
  });
  const done = loadPickupContext(
    {
      profile: () => {
        calls.push("profile");
        return profile;
      },
      pickupPoints: () => {
        calls.push("points");
        return points;
      },
    },
    { id: "1", universityId: "10" },
    { onProfile: (value) => profiles.push(value) },
  );
  assert.deepEqual(new Set(calls), new Set(["profile", "points"]));
  resolveProfile({ data: { user: { id: "1", universityId: "10" } } });
  await profile;
  await Promise.resolve();
  assert.equal(profiles[0].user.id, "1");
  resolvePoints({ data: [{ id: "11", universityId: "10" }] });
  assert.equal((await done).pickupPoints[0].id, "11");
});

test("profile school wins over an outdated session school; another user's profile is rejected", async () => {
  const calls = [];
  const api = {
    profile: async () => ({ data: { user: { id: "1", universityId: "20" } } }),
    pickupPoints: async (school) => {
      calls.push(school);
      return { data: [{ id: school, universityId: school }] };
    },
  };
  const result = await loadPickupContext(api, { id: "1", universityId: "10" });
  assert.deepEqual(calls, ["10", "20"]);
  assert.equal(result.pickupPoints[0].universityId, "20");
  await assert.rejects(
    loadPickupContext(api, { id: "other", universityId: "20" }),
    /프로필/,
  );
});
