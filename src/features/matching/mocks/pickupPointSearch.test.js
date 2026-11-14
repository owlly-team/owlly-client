import test from "node:test";
import assert from "node:assert/strict";
import { loadMockPickupPoints } from "./matchingMockData.js";

test("preview pickup uses coordinates returned by Kakao's Jukjeon main gate search", async () => {
  const original = globalThis.window;
  let places = [
    { place_name: "단국대학교 죽전캠퍼스 정문", y: "37.3", x: "127.1" },
  ];
  globalThis.window = {
    kakao: {
      maps: {
        Map: function () {},
        services: {
          Status: { OK: "OK" },
          Places: function () {
            this.keywordSearch = (keyword, callback) => {
              assert.equal(keyword, "단국대학교 죽전캠퍼스 정문");
              callback(places, "OK");
            };
          },
        },
      },
    },
  };
  try {
    const [point] = await loadMockPickupPoints();
    assert.equal(point.name, "단국대 정문");
    assert.deepEqual(point.point, { latitude: 37.3, longitude: 127.1 });
    places = [
      { place_name: "단국대학교 천안캠퍼스 정문", y: "36.8", x: "127.1" },
    ];
    await assert.rejects(
      loadMockPickupPoints(),
      /죽전캠퍼스 정문 검색 결과가 없어요/,
    );
    places = [
      { place_name: "단국대학교 죽전캠퍼스 정문", y: "unknown", x: "127.1" },
    ];
    await assert.rejects(loadMockPickupPoints(), /검색 결과가 없어요/);
  } finally {
    if (original === undefined) delete globalThis.window;
    else globalThis.window = original;
  }
});
