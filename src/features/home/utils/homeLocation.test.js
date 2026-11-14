import test from "node:test";
import assert from "node:assert/strict";
import { nearestPickupPoint, observeHomeLocation } from "./homeLocation.js";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

test("nearest label uses valid pickup coordinates and never invents a location", () => {
  const near = { id: "1", point: { latitude: 37.33, longitude: 127.27 } };
  const far = { id: "2", point: { latitude: 37.5, longitude: 127.5 } };
  assert.equal(
    nearestPickupPoint([far, { id: "bad" }, near], near.point),
    near,
  );
  assert.equal(nearestPickupPoint([near], null), null);
  assert.equal(nearestPickupPoint([], near.point), null);
});

test("denied and prompt permissions do not ask for GPS or retain coordinates", async () => {
  for (const state of ["denied", "prompt"]) {
    const permission = Object.assign(new EventTarget(), { state });
    const updates = [];
    let gpsRequests = 0;
    const stop = observeHomeLocation(
      {
        permissions: { query: async () => permission },
        geolocation: {
          getCurrentPosition: () => {
            gpsRequests += 1;
          },
        },
      },
      (value) => updates.push(value),
    );
    await flush();
    assert.equal(gpsRequests, 0);
    assert.deepEqual(updates, [{ status: state, point: null }]);
    stop();
  }
});

test("granted location updates the nearest input and revocation ignores a stale GPS reply", async () => {
  const permission = Object.assign(new EventTarget(), { state: "granted" });
  const updates = [];
  const callbacks = [];
  const stop = observeHomeLocation(
    {
      permissions: { query: async () => permission },
      geolocation: { getCurrentPosition: (success) => callbacks.push(success) },
    },
    (value) => updates.push(value),
  );
  await flush();
  callbacks[0]({ coords: { latitude: 37.33, longitude: 127.27 } });
  assert.deepEqual(updates.at(-1), {
    status: "granted",
    point: { latitude: 37.33, longitude: 127.27 },
  });
  permission.dispatchEvent(new Event("change"));
  permission.state = "denied";
  permission.dispatchEvent(new Event("change"));
  callbacks[1]({ coords: { latitude: 37.5, longitude: 127.5 } });
  assert.deepEqual(updates.at(-1), { status: "denied", point: null });
  const count = updates.length;
  stop();
  permission.state = "granted";
  permission.dispatchEvent(new Event("change"));
  assert.equal(updates.length, count);
  assert.equal(callbacks.length, 2);
});

test("unavailable browser APIs and GPS failures fall back without coordinates", async () => {
  const updates = [];
  const stop = observeHomeLocation({}, (value) => updates.push(value));
  await flush();
  assert.deepEqual(updates, [{ status: "unavailable", point: null }]);
  stop();
  const permission = Object.assign(new EventTarget(), { state: "granted" });
  const stopFailure = observeHomeLocation(
    {
      permissions: { query: async () => permission },
      geolocation: { getCurrentPosition: (_success, failure) => failure() },
    },
    (value) => updates.push(value),
  );
  await flush();
  assert.deepEqual(updates.at(-1), { status: "unavailable", point: null });
  stopFailure();
});
